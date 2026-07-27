package com.watchparty.backend.model;

import lombok.Data;

@Data
public class SyncStatePayload {
    private String playState;
    private double currentTime;
    private String videoId;
}