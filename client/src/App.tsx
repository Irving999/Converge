import RoomEditor from "./components/RoomEditor";
import Lobby from "./components/Lobby";

function App() {
    const url = new URLSearchParams(window.location.search);
    const roomId = url.get("room");

    return roomId ? <RoomEditor roomId={String(roomId)} /> : <Lobby />;
}

export default App;