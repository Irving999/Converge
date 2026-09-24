import { useState } from "react";

function Lobby() {
    const [roomId, setRoomId] = useState<string>("");

    const enterRoom = () => {
        const cleanRoomId = roomId.trim();

        if (!cleanRoomId) {
            return;
        }

        window.location.href = `?room=${encodeURIComponent(cleanRoomId)}`;
    }

    return (
        <main>
            <h2>This is the lobby</h2>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    enterRoom();
                }}
            >
                <label htmlFor="roomId">Room ID</label>
                <input
                    type="text"
                    name="roomId"
                    id="roomId"
                    value={roomId}
                    onChange={(event) => setRoomId(event.currentTarget.value)}
                    placeholder="Enter room id"
                    required
                />
                <button type="submit">Enter room</button>
            </form>
        </main>

    )
}

export default Lobby;