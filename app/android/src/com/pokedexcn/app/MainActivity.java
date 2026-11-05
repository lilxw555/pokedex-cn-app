package com.pokedexcn.app;
import android.app.Activity;import android.app.PendingIntent;import android.content.Intent;import android.content.pm.PackageInstaller;
import android.net.Uri;import android.os.Build;import android.os.Bundle;import android.provider.Settings;
import android.webkit.JavascriptInterface;import android.webkit.WebSettings;import android.webkit.WebView;import android.webkit.WebViewClient;import android.webkit.WebResourceRequest;
import java.io.*;import java.net.HttpURLConnection;import java.net.URL;import java.security.MessageDigest;
public class MainActivity extends Activity {
  private WebView web; private File pendingApk; private boolean waitingPerm=false;
  private static final String ACTION_STATUS="com.pokedexcn.app.INSTALL_STATUS";
  @Override protected void onCreate(Bundle b){super.onCreate(b);
    web=new WebView(this);setContentView(web);
    WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);
    s.setMediaPlaybackRequiresUserGesture(false);s.setUserAgentString(s.getUserAgentString()+" PokedexCN-App/"+version());
    web.addJavascriptInterface(new Bridge(),"PokedexAndroid");
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return ext(r.getUrl());}
      @SuppressWarnings("deprecation") @Override public boolean shouldOverrideUrlLoading(WebView v,String u){return ext(Uri.parse(u));}});
    if(b!=null)web.restoreState(b);else web.loadUrl("file:///android_asset/site/index.html");}
  private String version(){try{return getPackageManager().getPackageInfo(getPackageName(),0).versionName;}catch(Exception e){return "0";}}
  private boolean ext(Uri u){if("file".equals(u.getScheme()))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){}return true;}
  private void js(final String code){runOnUiThread(new Runnable(){public void run(){web.evaluateJavascript(code,null);}});}
  private static String q(String s){return "'"+s.replace("\\","\\\\").replace("'","\\'").replace("\n"," ")+"'";}
  private static boolean allowed(String u){return u.startsWith("https://pokedex-cn.netlify.app/");}
  private static HttpURLConnection open(String u)throws IOException{HttpURLConnection c=(HttpURLConnection)new URL(u).openConnection();
    c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setInstanceFollowRedirects(true);c.setRequestProperty("Cache-Control","no-cache");
    if(c.getResponseCode()!=200)throw new IOException("HTTP "+c.getResponseCode());return c;}
  class Bridge {
    @JavascriptInterface public String version(){return MainActivity.this.version();}
    @JavascriptInterface public void fetchText(final String url,final String cb){new Thread(new Runnable(){public void run(){
      try{if(!allowed(url))throw new IOException("不允许的地址");HttpURLConnection c=open(url);
        BufferedReader r=new BufferedReader(new InputStreamReader(c.getInputStream(),"UTF-8"));StringBuilder sb=new StringBuilder();String l;
        while((l=r.readLine())!=null){sb.append(l).append('\n');if(sb.length()>65536)throw new IOException("清单过大");}r.close();
        js("window."+cb+"&&window."+cb+"(true,"+q(sb.toString())+")");}
      catch(Exception e){js("window."+cb+"&&window."+cb+"(false,"+q(String.valueOf(e.getMessage()))+")");}}}).start();}
    @JavascriptInterface public void download(final String url,final String sha){new Thread(new Runnable(){public void run(){
      try{if(!allowed(url))throw new IOException("不允许的下载地址");HttpURLConnection c=open(url);long total=c.getContentLength();
        File f=new File(getCacheDir(),"update.apk");MessageDigest md=MessageDigest.getInstance("SHA-256");
        InputStream in=c.getInputStream();OutputStream out=new FileOutputStream(f);byte[] buf=new byte[65536];long got=0,last=0;int n;
        while((n=in.read(buf))>0){out.write(buf,0,n);md.update(buf,0,n);got+=n;long now=System.currentTimeMillis();
          if(total>0&&now-last>150){last=now;js("window.__pkdxUpd&&__pkdxUpd('progress',"+((double)got/total)+")");}}
        out.close();in.close();StringBuilder h=new StringBuilder();for(byte x:md.digest())h.append(String.format("%02x",x));
        if(!h.toString().equalsIgnoreCase(sha)){f.delete();throw new IOException("文件校验失败（SHA-256 不一致）");}
        pendingApk=f;js("window.__pkdxUpd&&__pkdxUpd('done','')");
        runOnUiThread(new Runnable(){public void run(){install();}});}
      catch(Exception e){js("window.__pkdxUpd&&__pkdxUpd('error',"+q(String.valueOf(e.getMessage()))+")");}}}).start();}
  }
  // Android 8+：需要用户允许“安装未知应用”；授权后回到应用时继续安装
  private void install(){if(pendingApk==null)return;
    if(Build.VERSION.SDK_INT>=26&&!getPackageManager().canRequestPackageInstalls()){
      js("window.__pkdxUpd&&__pkdxUpd('note','请在设置中允许本应用“安装未知应用”，返回后会自动继续')");
      waitingPerm=true;startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())));return;}
    // 使用系统 PackageInstaller 会话安装（不需要 FileProvider）
    try{PackageInstaller pi=getPackageManager().getPackageInstaller();
      PackageInstaller.SessionParams p=new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);p.setSize(pendingApk.length());
      int id=pi.createSession(p);PackageInstaller.Session ss=pi.openSession(id);
      InputStream in=new FileInputStream(pendingApk);OutputStream out=ss.openWrite("base.apk",0,pendingApk.length());byte[] buf=new byte[65536];int n;
      while((n=in.read(buf))>0)out.write(buf,0,n);ss.fsync(out);out.close();in.close();
      Intent it=new Intent(this,MainActivity.class).setAction(ACTION_STATUS);
      int fl=PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=31?0x02000000/*FLAG_MUTABLE*/:0);
      ss.commit(PendingIntent.getActivity(this,id,it,fl).getIntentSender());ss.close();}
    catch(Exception e){js("window.__pkdxUpd&&__pkdxUpd('error',"+q("无法启动安装："+e.getMessage())+")");}}
  @Override protected void onNewIntent(Intent i){super.onNewIntent(i);
    if(!ACTION_STATUS.equals(i.getAction()))return;int st=i.getIntExtra(PackageInstaller.EXTRA_STATUS,-999);
    if(st==PackageInstaller.STATUS_PENDING_USER_ACTION){Intent c=i.getParcelableExtra(Intent.EXTRA_INTENT);if(c!=null)startActivity(c);}
    else if(st!=PackageInstaller.STATUS_SUCCESS)js("window.__pkdxUpd&&__pkdxUpd('error',"+q("安装未完成："+i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE))+")");}
  @Override protected void onResume(){super.onResume();
    if(waitingPerm&&pendingApk!=null&&getPackageManager().canRequestPackageInstalls()){waitingPerm=false;install();}}
  @Override protected void onSaveInstanceState(Bundle o){super.onSaveInstanceState(o);web.saveState(o);}
  @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
