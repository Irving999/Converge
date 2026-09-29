import { useEffect, useState } from "react";
import {
    type Project,
    type File,
    getProjects,
    createProject,
    createFile,
    getFiles,
} from "../api";

function Lobby() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectName, setProjectName] = useState("");
    const [fileName, setFileName] = useState("");

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        getProjects()
            .then(setProjects)
            .catch((error) => {
                console.error("Failed to load projects", error);
            });
    }, []);

    useEffect(() => {
        if (!selectedProjectId) {
            setFiles([]);
            return;
        }

        getFiles(selectedProjectId)
            .then(setFiles)
            .catch((error) => {
                console.error("Failed to load files", error);
            });
    }, [selectedProjectId]);

    const onCreateProject = async () => {
        try {
            const project = await createProject(projectName);

            await createFile(project.id, "main.ts");

            setProjects((currentProjects) => [
                project,
                ...currentProjects,
            ]);

            setProjectName("");
        } catch (error) {
            console.error("Failed to create a project", error);
        }
    }

    const onCreateFile = async () => {
        if (!selectedProjectId) {
            return;
        }

        try {
            const file = await createFile(
                selectedProjectId,
                fileName.trim(),
            );

            setFiles((currentFiles) => [
                ...currentFiles,
                file,
            ]);

            setFileName("");
        } catch (error) {
            console.error("Failed to create file", error);
        }
    }

    return (
        <main>
            <h2>This is the lobby</h2>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onCreateProject();
                }}
            >
                <label htmlFor="projectName">Create Project: </label>
                <input
                    type="text"
                    name="projectName"
                    id="projectName"
                    value={projectName}
                    onChange={(event) => setProjectName(event.currentTarget.value)}
                    placeholder="Enter project name"
                    required
                />
                <button type="submit">Create</button>
            </form>

            <ul>
                {projects.map((project) => (
                    <li key={project.id}>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedProjectId(project.id)
                            }}
                        >
                            {project.name}
                        </button>
                    </li>
                ))}
            </ul>

            <ul>
                {files.map((file) => (
                    <li key={file.id}>
                        <button
                            type="button"
                            onClick={() => {
                                window.location.href =
                                    `?file=${encodeURIComponent(file.id)}`
                            }}
                        >
                            {file.name}
                        </button>
                    </li>
                ))}
            </ul>

            {selectedProjectId && (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onCreateFile();
                    }}
                >
                    <label htmlFor="fileName">New file:</label>
                    <input
                        id="fileName"
                        value={fileName}
                        onChange={(event) => setFileName(event.currentTarget.value)}
                        placeholder="utils.ts"
                        required
                    />
                    <button type="submit">Create file</button>
                </form>
            )}
        </main>

    )
}
                           
export default Lobby;