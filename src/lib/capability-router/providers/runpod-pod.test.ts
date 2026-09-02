import { describe, expect, it, beforeEach } from "vitest";
import {
  acquireRunpodGpu,
  isRunpodOnDemandConfigured,
  releaseRunpodGpu,
  resetRunpodLeaseForTests,
  snapshotFromPodPayload,
  waitForRunpodSsh,
} from "@/lib/capability-router/providers/runpod-pod";

describe("RunPod on-demand (provider TRELLIS)", () => {
  beforeEach(() => {
    resetRunpodLeaseForTests();
  });

  it("só liga com API key e pod id ou volume", () => {
    expect(isRunpodOnDemandConfigured({})).toBe(false);
    expect(
      isRunpodOnDemandConfigured({
        STUDIO_RUNPOD_API_KEY: "k",
        STUDIO_RUNPOD_POD_ID: "pod1",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isRunpodOnDemandConfigured({
        STUDIO_RUNPOD_API_KEY: "k",
        STUDIO_RUNPOD_NETWORK_VOLUME_ID: "vol1",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("lê SSH direto do payload do pod", () => {
    const snap = snapshotFromPodPayload({
      id: "pod1",
      status: "RUNNING",
      ssh: {
        direct: { host: "1.2.3.4", port: 2222, username: "root" },
      },
    });
    expect(snap.ssh).toEqual({
      podId: "pod1",
      host: "1.2.3.4",
      port: 2222,
      username: "root",
    });
  });

  it("espera RUNNING + SSH e faz start se o pod estiver parado", async () => {
    const calls: string[] = [];
    let status = "EXITED";
    const client = {
      async getPod() {
        calls.push(`get:${status}`);
        return {
          id: "pod1",
          status,
          ssh:
            status === "RUNNING"
              ? { podId: "pod1", host: "10.0.0.1", port: 22, username: "root" }
              : null,
        };
      },
      async action(_id: string, action: "start" | "stop" | "terminate") {
        calls.push(action);
        if (action === "start") status = "RUNNING";
        if (action === "stop") status = "EXITED";
        return {
          id: "pod1",
          status,
          ssh: status === "RUNNING"
            ? { podId: "pod1", host: "10.0.0.1", port: 22, username: "root" }
            : null,
        };
      },
      async createPod() {
        throw new Error("createPod não usado neste teste");
      },
    };

    const env = {
      STUDIO_RUNPOD_API_KEY: "k",
      STUDIO_RUNPOD_POD_ID: "pod1",
    } as NodeJS.ProcessEnv;

    const ssh = await acquireRunpodGpu(env, () => client);
    expect(ssh.host).toBe("10.0.0.1");
    expect(calls).toContain("start");

    await releaseRunpodGpu(env, () => client);
    expect(calls).toContain("stop");
  });

  it("não desliga enquanto houver outro job (lease)", async () => {
    const stops: string[] = [];
    const client = {
      async getPod() {
        return {
          id: "pod1",
          status: "RUNNING",
          ssh: { podId: "pod1", host: "10.0.0.1", port: 22, username: "root" },
        };
      },
      async action(_id: string, action: "start" | "stop" | "terminate") {
        if (action === "stop") stops.push("stop");
        return this.getPod();
      },
      async createPod() {
        throw new Error("createPod não usado neste teste");
      },
    };
    const env = {
      STUDIO_RUNPOD_API_KEY: "k",
      STUDIO_RUNPOD_POD_ID: "pod1",
    } as NodeJS.ProcessEnv;

    await acquireRunpodGpu(env, () => client);
    await acquireRunpodGpu(env, () => client);
    await releaseRunpodGpu(env, () => client);
    expect(stops).toEqual([]);
    await releaseRunpodGpu(env, () => client);
    expect(stops).toEqual(["stop"]);
  });

  it("waitForRunpodSsh falha em ERROR", async () => {
    await expect(
      waitForRunpodSsh(
        {
          getPod: async () => ({ id: "p", status: "ERROR", ssh: null }),
          action: async () => ({ id: "p", status: "ERROR", ssh: null }),
          createPod: async () => ({ id: "p", status: "ERROR", ssh: null }),
        },
        "p",
        1000,
        () => 0,
        async () => undefined,
      ),
    ).rejects.toThrow(/ERROR/);
  });

  it("repete start se o host não tiver GPU livre", async () => {
    let starts = 0;
    let status = "EXITED";
    const client = {
      async getPod() {
        return {
          id: "pod1",
          status,
          ssh:
            status === "RUNNING"
              ? { podId: "pod1", host: "10.0.0.1", port: 22, username: "root" }
              : null,
        };
      },
      async action(_id: string, action: "start" | "stop" | "terminate") {
        if (action === "start") {
          starts += 1;
          if (starts === 1) {
            throw new Error(
              "start pod pod1 falhou (400): There are not enough free GPUs on the host machine to start this pod.",
            );
          }
          status = "RUNNING";
        }
        return this.getPod();
      },
      async createPod() {
        throw new Error("createPod não usado neste teste");
      },
    };
    const env = {
      STUDIO_RUNPOD_API_KEY: "k",
      STUDIO_RUNPOD_POD_ID: "pod1",
    } as NodeJS.ProcessEnv;

    const ssh = await acquireRunpodGpu(env, () => client, async () => undefined);
    expect(starts).toBe(2);
    expect(ssh.host).toBe("10.0.0.1");
  });

  it("com volume cria um pod novo e faz terminate", async () => {
    const calls: string[] = [];
    const client = {
      async getPod() {
        return {
          id: "new1",
          status: "RUNNING",
          ssh: { podId: "new1", host: "10.0.0.2", port: 22, username: "root" },
        };
      },
      async action(_id: string, action: "start" | "stop" | "terminate") {
        calls.push(action);
        return this.getPod();
      },
      async createPod() {
        calls.push("create");
        return this.getPod();
      },
    };
    const env = {
      STUDIO_RUNPOD_API_KEY: "k",
      STUDIO_RUNPOD_NETWORK_VOLUME_ID: "vol1",
      STUDIO_RUNPOD_SSH_PUBLIC_KEY: "ssh-ed25519 AAAA test",
    } as NodeJS.ProcessEnv;

    const ssh = await acquireRunpodGpu(env, () => client);
    expect(ssh.host).toBe("10.0.0.2");
    expect(calls).toContain("create");
    await releaseRunpodGpu(env, () => client);
    expect(calls).toContain("terminate");
    expect(calls).not.toContain("stop");
  });
});
