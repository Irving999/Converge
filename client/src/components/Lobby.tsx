import { useEffect, useState } from "react";
import {
    type Project,
    getProjects,
    createProject,
} from "../api";

function Lobby() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectName, setProjectName] = useState<string>("");

    useEffect(() => {
        getProjects()
            .then(setProjects)
            .catch((error) => {
                console.error("Failed to load projects", error);
            });
    }, []);

    const onSubmit = async () => {
        try {
            const project = await createProject(projectName);

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
                    <li key={project.id}>{project.name}</li>
                ))}
            </ul>
        </main>

    )
}

export default Lobby;