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
        let socketUrl = import.meta.env.VITE_API_URL;

        // If VITE_API_URL is not set:
        // - In Production: Default to '/' (current origin), assuming Nginx handles proxying
        // - In Development: Default to 'http://localhost:3000'
        if (!socketUrl) {
            socketUrl = import.meta.env.PROD ? '/' : 'http://localhost:3000';
        } else {
            // If VITE_API_URL is set (e.g. "https://api.example.com/api"), 
            // we usually want to connect to the root ("https://api.example.com") for Socket.IO
            // unless the backend explicitly serves socket.io under /api/socket.io (uncommon with standard Nginx setup)
            try {
                if (socketUrl.startsWith('http')) {
                    const urlObj = new URL(socketUrl);
                    socketUrl = urlObj.origin;
                }
            } catch (e) {
                console.warn('Invalid VITE_API_URL for socket, falling back to default', e);
                socketUrl = import.meta.env.PROD ? '/' : 'http://localhost:3000';
            }
        }

        // Initialize socket connection
        const newSocket = io(socketUrl, {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling'], // Try websocket first
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            path: '/socket.io/' // Explicitly set path (default is /socket.io/, but good to be explicit)
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
