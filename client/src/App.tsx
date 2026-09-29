import FileEditor from "./components/FileEditor";
import Lobby from "./components/Lobby";

function App() {
    const url = new URLSearchParams(window.location.search);
    const fileId = url.get("file");

    return fileId ? <FileEditor fileId={String(fileId)} /> : <Lobby />;
}

export default App;
