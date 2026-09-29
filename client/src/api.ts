export type Project = {
    id: string;
    name: string;
    created_at: string;
};

export async function getProjects(): Promise<Project[]> {
    const response = await fetch("/api/projects");

    if (!response.ok) {
        throw new Error("Failed to load projects");
    }

    return response.json();
}

export async function createProject(name: string): Promise<Project> {
    const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        throw new Error("Failed to create project");
    }

    return response.json();
}