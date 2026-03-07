import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "./Chat.css";

const API = process.env.REACT_APP_API_URL;
const POLL_INTERVAL = 5000;

const Chat = () => {
    const { user, isAdmin } = useAuth();
    const strings = useStrings();
    const navigate = useNavigate();
    const s = strings.chat || {};

    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const lastMessageIdRef = useRef(null);
    const pollRef = useRef(null);

    const headers = { "X-User-Id": String(user?.userId || "") };

    // Fetch rooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await axios.get(`${API}/api/chat/rooms`, { headers });
                setRooms(res.data);
                if (res.data.length > 0 && !selectedRoom) {
                    setSelectedRoom(res.data[0]);
                }
            } catch { /* ignore */ }
        };
        fetchRooms();
    }, []);

    // Fetch messages for selected room
    const fetchMessages = useCallback(async (isPolling = false) => {
        if (!selectedRoom) return;
        try {
            const afterParam = isPolling && lastMessageIdRef.current
                ? `?afterId=${lastMessageIdRef.current}&limit=50`
                : "?limit=50";
            const res = await axios.get(
                `${API}/api/chat/rooms/${selectedRoom.id}/messages${afterParam}`,
                { headers }
            );
            if (isPolling && lastMessageIdRef.current && res.data.length > 0) {
                setMessages(prev => [...prev, ...res.data]);
            } else if (!isPolling) {
                setMessages(res.data);
            }
            if (res.data.length > 0) {
                lastMessageIdRef.current = res.data[res.data.length - 1].id;
            }
        } catch { /* ignore */ }
    }, [selectedRoom, user?.userId]);

    // Initial load when room changes
    useEffect(() => {
        lastMessageIdRef.current = null;
        setMessages([]);
        fetchMessages(false);
    }, [selectedRoom]);

    // Polling
    useEffect(() => {
        if (!selectedRoom) return;
        pollRef.current = setInterval(() => fetchMessages(true), POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [selectedRoom, fetchMessages]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedRoom) return;
        setSending(true);
        try {
            const res = await axios.post(
                `${API}/api/chat/rooms/${selectedRoom.id}/messages`,
                { message: newMessage.trim() },
                { headers }
            );
            setMessages(prev => [...prev, res.data]);
            lastMessageIdRef.current = res.data.id;
            setNewMessage("");
        } catch { /* ignore */ }
        setSending(false);
    };

    const handleDelete = async (messageId) => {
        try {
            await axios.delete(`${API}/api/chat/messages/${messageId}`, { headers });
            setMessages(prev =>
                prev.map(m => m.id === messageId ? { ...m, message: "[deleted]", isDeleted: true } : m)
            );
        } catch { /* ignore */ }
    };

    const selectRoom = (room) => {
        setSelectedRoom(room);
    };

    const roomIcons = {
        Art: "\uD83C\uDFA8",
        Music: "\uD83C\uDFB5",
        Writing: "\u270D\uFE0F",
        Tech: "\uD83D\uDCBB",
        Creativity: "\u2728",
        Community: "\uD83C\uDF10"
    };

    return (
        <div className="chat-container">
            <div className="chat-nav-bar">
                <button className="bm-btn bm-btn-back" onClick={() => navigate(-1)}>
                    {strings.common.back}
                </button>
                <Link to="/books" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
                    {strings.readBook?.books || "Books"}
                </Link>
                <Link to="/" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
                    {strings.readBook?.home || "Home"}
                </Link>
            </div>
            <div className="chat-sidebar">
                <h2>{s.roomsHeading || "Chat Rooms"}</h2>
                <div className="chat-room-list">
                    {rooms.map((room) => (
                        <button
                            key={room.id}
                            className={`chat-room-item ${selectedRoom?.id === room.id ? "active" : ""}`}
                            onClick={() => selectRoom(room)}
                        >
                            <span className="room-icon">{roomIcons[room.category] || "\uD83D\uDCAC"}</span>
                            <div className="room-info">
                                <span className="room-name">{room.name}</span>
                                <span className="room-desc">{room.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="chat-main">
                {selectedRoom ? (
                    <>
                        <div className="chat-header">
                            <span className="chat-header-icon">{roomIcons[selectedRoom.category] || "\uD83D\uDCAC"}</span>
                            <h3>{selectedRoom.name}</h3>
                        </div>
                        <div className="chat-messages">
                            {messages.length === 0 && (
                                <div className="chat-empty">{s.noMessages || "No messages yet. Start the conversation!"}</div>
                            )}
                            {messages.map((msg) => {
                                const isOwnMessage = msg.senderId === user?.userId;
                                return (
                                    <div
                                        key={msg.id}
                                        className={`chat-msg ${isOwnMessage ? "chat-msg-own" : "chat-msg-other"}`}
                                    >
                                        {!isOwnMessage && (
                                            <div className="chat-msg-sender">{msg.senderName}</div>
                                        )}
                                        <div className="chat-msg-bubble">
                                            <div className="chat-msg-text">{msg.message}</div>
                                            <div className="chat-msg-meta">
                                                <span className="chat-msg-time">{msg.createdDate}</span>
                                                {!msg.isDeleted && (isOwnMessage || isAdmin) && (
                                                    <button
                                                        className="chat-msg-delete"
                                                        onClick={() => handleDelete(msg.id)}
                                                        title={s.deleteMessage || "Delete"}
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-bar" onSubmit={handleSend}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={s.placeholder || "Type a message..."}
                                disabled={sending}
                                maxLength={500}
                            />
                            <button type="submit" disabled={sending || !newMessage.trim()}>
                                {sending ? (s.sending || "...") : (s.sendButton || "Send")}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="chat-empty-room">{s.selectRoom || "Select a room to start chatting"}</div>
                )}
            </div>
        </div>
    );
};

export default Chat;
