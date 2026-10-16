import type {DiscoverServicesResponse} from "../types/service";
import { apiRequest } from "./api";

export async function discoverServices(signal?: AbortSignal, token?: string): Promise<DiscoverServicesResponse> {
    return apiRequest<DiscoverServicesResponse>("/api/servicos/discover", { signal, cache: "no-store" }, token);
}
