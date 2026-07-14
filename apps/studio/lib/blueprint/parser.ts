import { ProjectBlueprint } from "./types";

export function parseBlueprint(
    text: string
): ProjectBlueprint | null {

    try {

        const json = JSON.parse(text);

        return json;

    }

    catch {

        return null;

    }

}