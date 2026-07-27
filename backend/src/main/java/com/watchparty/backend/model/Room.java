package com.watchparty.backend.model;

import java.util.ArrayList;
import java.util.List;

public class Room {
    private String roomId;
    private String currentVideoId = "";
    private double currentTime = 0.0;
    private String playState = "PAUSED";
    private List<Participant> participants = new ArrayList<>();

    // Explicit Getters and Setters
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    
    public String getCurrentVideoId() { return currentVideoId; }
    public void setCurrentVideoId(String currentVideoId) { this.currentVideoId = currentVideoId; }
    
    public double getCurrentTime() { return currentTime; }
    public void setCurrentTime(double currentTime) { this.currentTime = currentTime; }
    
    public String getPlayState() { return playState; }
    public void setPlayState(String playState) { this.playState = playState; }
    
    public List<Participant> getParticipants() { return participants; }
    public void setParticipants(List<Participant> participants) { this.participants = participants; }

    public void addParticipant(Participant participant) {
        this.participants.add(participant);
    }

    public void removeParticipant(String userId) {
        this.participants.removeIf(p -> p.getUserId().equals(userId));
    }
}