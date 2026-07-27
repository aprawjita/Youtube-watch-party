package com.watchparty.backend.controller;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.watchparty.backend.model.JoinRoomRequest;
import com.watchparty.backend.model.Participant;
import com.watchparty.backend.model.Room;

@Controller
public class RoomController {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, Room> activeRooms = new ConcurrentHashMap<>();

    public RoomController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/join")
    public void joinRoom(@Payload JoinRoomRequest request) {
        String roomId = request.getRoomId();
        
        activeRooms.putIfAbsent(roomId, new Room());
        Room room = activeRooms.get(roomId);
        room.setRoomId(roomId); 
        
        String role = room.getParticipants().isEmpty() ? "Host" : "Participant";
        
        Participant newParticipant = new Participant(request.getUsername(), request.getUsername(), role);
        room.addParticipant(newParticipant);
        
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/participants", room.getParticipants());
    }
    
    @MessageMapping("/action")
    public void handleAction(@Payload Map<String, Object> action) {
        String roomId = (String) action.get("roomId");
        Room room = activeRooms.get(roomId); 
        
        if (room != null) {
            String type = (String) action.get("type");
            
            if ("CHANGE_VIDEO".equals(type)) {
                room.setCurrentVideoId((String) action.get("videoId"));
                room.setPlayState("PLAYING");
                room.setCurrentTime(0.0);
            } else if ("PLAY".equals(type)) {
                room.setPlayState("PLAYING");
                if (action.get("time") != null) room.setCurrentTime(((Number) action.get("time")).doubleValue());
            } else if ("PAUSE".equals(type)) {
                room.setPlayState("PAUSED");
                if (action.get("time") != null) room.setCurrentTime(((Number) action.get("time")).doubleValue());
            } else if ("SEEK".equals(type)) {
                if (action.get("time") != null) room.setCurrentTime(((Number) action.get("time")).doubleValue());
            }

            // FIXED: Explicitly cast to (Object) to resolve Java compiler ambiguity
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/actions", (Object) action);
        }
    }
   
    @MessageMapping("/assignRole")
    public void assignRole(@Payload Map<String, Object> payload) {
        String roomId = String.valueOf(payload.get("roomId"));
        String hostUsername = String.valueOf(payload.get("username"));
        String targetUsername = String.valueOf(payload.get("targetUsername"));
        String newRole = String.valueOf(payload.get("newRole"));

        Room room = activeRooms.get(roomId);
        if (room != null) {
            Participant host = room.getParticipants().stream()
                    .filter(p -> p.getUsername().equals(hostUsername))
                    .findFirst().orElse(null);

            if (host != null && "Host".equals(host.getRole())) {
                Participant target = room.getParticipants().stream()
                        .filter(p -> p.getUsername().equals(targetUsername))
                        .findFirst().orElse(null);

                if (target != null) {
                    if ("Host".equals(newRole)) {
                        host.setRole("Participant"); 
                    }
                    target.setRole(newRole); 
                    messagingTemplate.convertAndSend("/topic/room/" + roomId + "/participants", room.getParticipants());
                }
            }
        }
    }

    @MessageMapping("/kick")
    public void kickUser(@Payload Map<String, Object> payload) {
        String roomId = String.valueOf(payload.get("roomId"));
        String hostUsername = String.valueOf(payload.get("username"));
        String targetUsername = String.valueOf(payload.get("targetUsername"));

        Room room = activeRooms.get(roomId);
        if (room != null) {
            Participant host = room.getParticipants().stream()
                    .filter(p -> p.getUsername().equals(hostUsername))
                    .findFirst().orElse(null);

            if (host != null && "Host".equals(host.getRole())) {
                room.getParticipants().removeIf(p -> p.getUsername().equals(targetUsername));
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/participants", room.getParticipants());
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/kicked", targetUsername);
            }
        }
    }

    @MessageMapping("/sync")
    public void syncVideoState(@Payload Map<String, Object> payload) {
        String roomId = String.valueOf(payload.get("roomId"));
        if (roomId != null && !roomId.equals("null")) {
            // FIXED: Explicitly cast to (Object) to resolve Java compiler ambiguity
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/sync", (Object) payload);
        }
    }
}