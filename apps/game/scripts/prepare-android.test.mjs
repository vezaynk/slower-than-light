import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { prepareAndroid } from "./prepare-android.mjs";

const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
        </activity>
    </application>
</manifest>
`;

const STYLES = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
`;

const GRADLE = `apply plugin: 'com.android.application'

android {
    namespace = "io.knyazev.lighterthanair"
    defaultConfig {
        applicationId "io.knyazev.lighterthanair"
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
`;

function project() {
  const androidDir = mkdtempSync(join(tmpdir(), "prepare-android-"));
  mkdirSync(join(androidDir, "app/src/main/assets"), { recursive: true });
  mkdirSync(join(androidDir, "app/src/main/res/values"), { recursive: true });
  writeFileSync(join(androidDir, "app/src/main/AndroidManifest.xml"), MANIFEST);
  writeFileSync(join(androidDir, "app/src/main/res/values/styles.xml"), STYLES);
  writeFileSync(
    join(androidDir, "app/src/main/assets/capacitor.config.json"),
    JSON.stringify({ appId: "io.knyazev.lighterthanair", webDir: "dist/client" }),
  );
  writeFileSync(join(androidDir, "app/build.gradle"), GRADLE);
  return androidDir;
}

test("prepareAndroid locks landscape, hides the bars, and stamps the run version", () => {
  const androidDir = project();
  prepareAndroid(androidDir, { versionCode: 12, versionName: "1.0.12" });

  const manifest = readFileSync(join(androidDir, "app/src/main/AndroidManifest.xml"), "utf8");
  assert.equal(manifest.split("sensorLandscape").length - 1, 1);
  assert.match(manifest, /android:name="\.MainActivity"/);

  const styles = readFileSync(join(androidDir, "app/src/main/res/values/styles.xml"), "utf8");
  assert.equal(styles.split("windowLayoutInDisplayCutoutMode").length - 1, 2);

  const config = JSON.parse(
    readFileSync(join(androidDir, "app/src/main/assets/capacitor.config.json"), "utf8"),
  );
  assert.deepEqual(config.plugins.SystemBars, {
    hidden: true,
    insetsHandling: "css",
    style: "DARK",
    animation: "NONE",
  });

  const gradle = readFileSync(join(androidDir, "app/build.gradle"), "utf8");
  assert.match(gradle, /applicationId "io\.knyazev\.lighterthanair"/);
  assert.match(gradle, /versionCode 12\b/);
  assert.match(gradle, /versionName "1\.0\.12"/);
  assert.equal(gradle.includes("signingConfigs"), false);

  prepareAndroid(androidDir, { versionCode: 12, versionName: "1.0.12" });
  const again = readFileSync(join(androidDir, "app/src/main/AndroidManifest.xml"), "utf8");
  assert.equal(again.split("sensorLandscape").length - 1, 1);
});

test("prepareAndroid signs release when a keystore path is provided", () => {
  const androidDir = project();
  prepareAndroid(androidDir, {
    versionCode: 3,
    versionName: "1.0.3",
    keystorePath: "/tmp/upload.keystore",
  });
  const gradle = readFileSync(join(androidDir, "app/build.gradle"), "utf8");
  assert.match(gradle, /signingConfigs \{\s*release \{/);
  assert.match(gradle, /signingConfig signingConfigs\.release/);
  assert.equal(gradle.split("signingConfigs").length - 1, 2);

  prepareAndroid(androidDir, {
    versionCode: 4,
    versionName: "1.0.4",
    keystorePath: "/tmp/upload.keystore",
  });
  const again = readFileSync(join(androidDir, "app/build.gradle"), "utf8");
  assert.equal(again.split("storeFile").length - 1, 1);
  assert.match(again, /versionCode 4\b/);
});
