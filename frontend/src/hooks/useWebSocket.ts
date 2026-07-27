import { useState, useEffect, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const useWebSocket = (roomId: string, username: string) => {
    const [client, setClient] = useState<Client | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [action, setAction] = useState<any>(null);
    const [kicked, setKicked] = useState(false);
    
    // State to hold the continuous heartbeat sync for late joiners and drift correction
    const [syncData, setSyncData] = useState<any>(null);

    useEffect(() => {
        if (!roomId || !username) return;

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

        const stompClient = new Client({
            webSocketFactory: () => new SockJS(`${backendUrl}/ws`),
            onConnect: () => {
                stompClient.subscribe(`/topic/room/${roomId}/participants`, (msg) => {
                    setParticipants(JSON.parse(msg.body));
                });

                stompClient.subscribe(`/topic/room/${roomId}/action`, (msg) => {
                    setAction(JSON.parse(msg.body));
                });

                // Capture the sync payload broadcasted by the Host
                stompClient.subscribe(`/topic/room/${roomId}/sync`, (msg) => {
                    setSyncData(JSON.parse(msg.body));
                });

                stompClient.subscribe(`/topic/room/${roomId}/kicked`, (msg) => {
                    if (msg.body === username) {
                        setKicked(true);
                        stompClient.deactivate();
                    }
                });

                stompClient.publish({
                    destination: '/app/join',
                    body: JSON.stringify({ roomId, username })
                });
            }
        });

        stompClient.activate();
        setClient(stompClient);

        return () => {
            stompClient.deactivate();
        };
    }, [roomId, username]);

    const sendAction = useCallback((payload: any) => {
        if (client) {
            client.publish({
                destination: '/app/action',
                body: JSON.stringify(payload)
            });
        }
    }, [client]);

    const assignRole = useCallback((targetUsername: string, newRole: string) => {
        if (client) {
            client.publish({
                destination: '/app/assignRole',
                body: JSON.stringify({ roomId, username, targetUsername, newRole })
            });
        }
    }, [client, roomId, username]);

    const kickUser = useCallback((targetUsername: string) => {
        if (client) {
            client.publish({
                destination: '/app/kick',
                body: JSON.stringify({ roomId, username, targetUsername })
            });
        }
    }, [client, roomId, username]);

    const syncVideo = useCallback((payload: any) => {
        if (client) {
            client.publish({
                destination: '/app/sync',
                body: JSON.stringify(payload)
            });
        }
    }, [client]);

    return { participants, action, sendAction, assignRole, kickUser, syncVideo, kicked, syncData };
};