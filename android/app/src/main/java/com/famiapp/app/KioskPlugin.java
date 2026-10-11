package com.famiapp.app;

import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor-Plugin für Kiosk-Modus: Öffnet die Android Home/Launcher-Einstellungen
 * (Notausgang für Eltern, um die Launcher-App wieder zu ändern).
 */
@CapacitorPlugin(name = "Kiosk")
public class KioskPlugin extends Plugin {

    @PluginMethod
    public void openHomeSettings(PluginCall call) {
        if (getActivity() == null) {
            call.reject("Activity nicht verfügbar");
            return;
        }
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                intent = new Intent(Settings.ACTION_HOME_SETTINGS);
            } else {
                intent = new Intent(Settings.ACTION_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Home-Einstellungen konnten nicht geöffnet werden: " + e.getMessage());
        }
    }
}
