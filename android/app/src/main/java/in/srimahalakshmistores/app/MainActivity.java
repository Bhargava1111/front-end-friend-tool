package in.srimahalakshmistores.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String STORAGE_KEY = "mnxstore_native_api_url";
    private static final String CONFIG_ASSET = "mobile-server-config.json";
    private boolean apiInjected = false;

    @Override
    public void onStart() {
        super.onStart();
        injectVpsApiUrl();
    }

    private void injectVpsApiUrl() {
        if (apiInjected || bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;

        String apiUrl = readApiUrlFromAssets();
        if (apiUrl == null || apiUrl.isEmpty()) return;

        String escaped = apiUrl.replace("\\", "\\\\").replace("'", "\\'");
        String script =
            "try{localStorage.setItem('"
                + STORAGE_KEY
                + "','"
                + escaped
                + "');}catch(e){}";
        webView.evaluateJavascript(script, null);
        apiInjected = true;
    }

    private String readApiUrlFromAssets() {
        try (InputStream input = getAssets().open(CONFIG_ASSET)) {
            byte[] buffer = new byte[input.available()];
            int read = input.read(buffer);
            if (read <= 0) return "";
            JSONObject json = new JSONObject(new String(buffer, 0, read, StandardCharsets.UTF_8));
            return json.optString("apiUrl", "");
        } catch (Exception ignored) {
            return "";
        }
    }
}
