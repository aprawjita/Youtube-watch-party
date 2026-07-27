package com.watchparty.backend.model;

import lombok.Data;

@Data
public class JoinRoomRequest {
    private String roomId;
    private String username;
}