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
    const [projectName, setProjectName] = useState<string>("");

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

    const onSubmit = async () => {
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

    return (
        <main>
            <h2>This is the lobby</h2>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
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
        </main>

    )
}
                           
export default Lobby;