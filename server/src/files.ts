import { randomUUID } from "node:crypto";
import { pool } from "./db";

export type File = {
    id: string;
    project_id: string;
    name: string;
    language: string;
    created_at: Date;
};

export async function createFile(
    projectId: string,
    name: string,
    language: string,
): Promise<File> {
    const result = await pool.query<File>(
        `
            INSERT INTO files (id, project_id, name, language)
            VALUES ($1, $2, $3, $4)
            RETURNING id, project_id, name, language, created_at
        `,
        [randomUUID(), projectId, name, language],
    );

    return result.rows[0];
}

export async function listFiles(projectId: string): Promise<File[]> {
    const result = await pool.query<File>(
        `
            SELECT id, project_id, name, language, created_at
            FROM files
            WHERE project_id = $1
            ORDER BY created_at ASC
        `,
        [projectId],
    );

    return result.rows;
}

export async function getFile(fileId: string): Promise<File | null> {
    const result = await pool.query<File>(
        `
            SELECT id, project_id, name, language, created_at
            FROM files
            WHERE id = $1
        `,
        [fileId],
    );

    return result.rows[0] ?? null;
}