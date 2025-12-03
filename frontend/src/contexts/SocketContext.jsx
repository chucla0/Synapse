import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/auth';

const SocketContext = createContext(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = getToken();

        if (!token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Determine Socket URL
        // In production with Nginx proxying /socket.io, it's best to use the current origin (relative path)
        // This avoids Mixed Content issues (http vs https) and CORS issues.
        // We only use VITE_API_URL in development or if explicitly needed.
        let socketUrl = import.meta.env.PROD ? undefined : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

        // Initialize socket connection
        // passing 'undefined' as url makes io() connect to window.location (current host)
        const newSocket = io(socketUrl, {
            auth: {
                token: token
            },
            // transports: ['websocket', 'polling'], // Let Socket.IO decide
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            path: '/socket.io/'
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            setIsConnected(false);
        });

        setSocket(newSocket);

        // Cleanup on unmount or token change
        return () => {
            newSocket.disconnect();
        };
    }, [getToken()]); // Re-run if token changes (e.g. login/logout)

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
