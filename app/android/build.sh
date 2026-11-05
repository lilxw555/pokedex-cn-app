#!/bin/bash
: "${KS_PASS:?请先设置环境变量 KS_PASS（签名密钥库密码）}"
# 无 Gradle 的最小构建：aapt2 → javac → d8 → zipalign → apksigner
set -e; cd "$(dirname "$0")"
export JAVA_HOME=$(ls -d /workspace/android/jdk-17*) PATH=$(ls -d /workspace/android/jdk-17*)/bin:$PATH
SDK=/workspace/android/sdk BT=$SDK/build-tools/34.0.0 JAR=$SDK/platforms/android-34/android.jar
rm -rf out assets/site && mkdir -p out/res out/classes out/dex assets/site
rm -rf assets/site; python3 -c "import shutil;shutil.copytree('/workspace/pokedex-site','assets/site',ignore=shutil.ignore_patterns('screenshots','raw','scripts','promo','download','*.json','.git','*.bak','_headers'))"
$BT/aapt2 compile --dir res -o out/res.zip
$BT/aapt2 link -o out/base.apk -I $JAR --manifest AndroidManifest.xml -A assets out/res.zip --java out/gen --auto-add-overlay
javac -source 8 -target 8 -bootclasspath $JAR -classpath $JAR -d out/classes $(find src out/gen -name '*.java') 2>&1 | grep -v warning || true
$BT/d8 --min-api 24 --lib $JAR --output out/dex $(find out/classes -name '*.class')
cp out/base.apk out/unsigned.apk && python3 -c "import zipfile;zipfile.ZipFile('out/unsigned.apk','a').write('out/dex/classes.dex','classes.dex')"
$BT/zipalign -f -p 4 out/unsigned.apk out/aligned.apk
[ -f release.keystore ] || keytool -genkeypair -keystore release.keystore -storepass "$KS_PASS" -keypass "$KS_PASS" -alias pokedex -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Pokedex CN, O=Fan Project, C=CN"
$BT/apksigner sign --ks release.keystore --ks-pass env:KS_PASS --key-pass env:KS_PASS --out pokedex-cn.apk out/aligned.apk
$BT/apksigner verify --verbose --print-certs pokedex-cn.apk | head -8
$BT/aapt dump badging pokedex-cn.apk | grep -E "package|application-label|sdkVersion|launchable" 
ls -la pokedex-cn.apk
