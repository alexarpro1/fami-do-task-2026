package com.famiapp.app.tiles;

import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import androidx.annotation.RequiresApi;
import android.content.Intent;
import com.famiapp.app.MainActivity;

@RequiresApi(api = Build.VERSION_CODES.N)
public class RewardsTileService extends TileService {
    
    @Override
    public void onStartListening() {
        super.onStartListening();
        updateTile();
    }
    
    @Override
    public void onClick() {
        super.onClick();
        // Open the app with rewards intent
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("tile", "rewards");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        
        // Update tile
        updateTile();
    }
    
    private void updateTile() {
        Tile tile = getQsTile();
        if (tile != null) {
            tile.setState(Tile.STATE_ACTIVE);
            tile.setLabel("Belohnungen");
            tile.updateTile();
        }
    }
}

