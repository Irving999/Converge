import RoomEditor from "./components/RoomEditor";
import Lobby from "./components/Lobby";

function App() {
    const url = new URLSearchParams(window.location.search);
    const fileId = url.get("file");

    return fileId ? <RoomEditor fileId={String(fileId)} /> : <Lobby />;
}

export default App;