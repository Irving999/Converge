export type Project = {
    id: string;
    name: string;
    created_at: string;
};

export type File = {
    id: string;
    project_id: string;
    name: string;
    language: string;
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

export async function createFile(
    projectId: string,
    name: string,
    language = "typescript",
): Promise<File> {
    const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, language }),
    });

    if (!response.ok) {
        throw new Error("Failed to create file");
    }

    return response.json();
}

export async function getFiles(projectId: string): Promise<File[]> {
    const response = await fetch(`/api/projects/${projectId}/files`);

    if (!response.ok) {
        throw new Error("Failed to load files");
    }

    return response.json();
}

export async function getFile(fileId: string): Promise<File> {
    const response = await fetch(`api/files/${fileId}`);

    if (!response.ok) {
        throw new Error("Failed to load file");
    }

    return response.json();
}