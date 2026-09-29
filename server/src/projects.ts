import { randomUUID } from "node:crypto";
import { pool } from "./db";

export type Project = {
    id: string;
    name: string;
    created_at: Date;
};

export async function createProject(name: string): Promise<Project> {
    const result = await pool.query<Project>(
        `
            INSERT INTO projects(id, name)
            VALUES ($1, $2)
            RETURNING id, name, created_at
        `,
        [randomUUID(), name],
    );

    return result.rows[0];
}

export async function listProjects(): Promise<Project[]> {
    const result = await pool.query<Project>(
        `
            SELECT id, name, created_at
            FROM projects
            ORDER BY created_at DESC
        `,
    );

    return result.rows;
}