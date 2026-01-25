import { useState, useEffect } from "react";
import { colors, fonts, radius, inputBase, buttonPrimary, buttonSecondary } from "../theme.ts";
import type { ServiceInput, ServiceType, Service } from "../hooks/useServices.ts";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ServiceFormProps {
  initialData?: Service;
  isEditMode: boolean;
  onSubmit: (data: ServiceInput) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string;
}

export function ServiceForm({
  initialData,
  isEditMode,
  onSubmit,
  onCancel,
  isPending,
  error,
}: ServiceFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const id = isEditMode ? (initialData?.id || "") : slugify(name);
  const [cmd, setCmd] = useState(initialData?.cmd || "");
  const [type, setType] = useState<ServiceType>(initialData?.type || "service");
  const [cwd, setCwd] = useState(initialData?.cwd || "");
  const [port, setPort] = useState(initialData?.port?.toString() || "");
  const [healthUrl, setHealthUrl] = useState(initialData?.healthUrl || "");
  const [autoStart, setAutoStart] = useState(initialData?.autoStart ?? false);
  const [autoRestart, setAutoRestart] = useState(initialData?.autoRestart ?? false);
  const [restartDelay, setRestartDelay] = useState(initialData?.restartDelay?.toString() || "3000");
  const [maxRestarts, setMaxRestarts] = useState(initialData?.maxRestarts?.toString() || "5");
  const [envPairs, setEnvPairs] = useState<Array<{ key: string; value: string }>>(
    initialData?.env
      ? Object.entries(initialData.env).map(([key, value]) => ({ key, value }))
      : []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCmd(initialData.cmd);
      setType(initialData.type || "service");
      setCwd(initialData.cwd || "");
      setPort(initialData.port?.toString() || "");
      setHealthUrl(initialData.healthUrl || "");
      setAutoStart(initialData.autoStart ?? false);
      setAutoRestart(initialData.autoRestart ?? false);
      setRestartDelay(initialData.restartDelay?.toString() || "3000");
      setMaxRestarts(initialData.maxRestarts?.toString() || "5");
      setEnvPairs(
        initialData.env
          ? Object.entries(initialData.env).map(([key, value]) => ({ key, value }))
          : []
      );
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (!isEditMode && !id) {
      newErrors.name = "Name must contain at least one letter or number";
    }

    if (!cmd.trim()) {
      newErrors.cmd = "Command is required";
    }

    if (port && !/^\d+$/.test(port)) {
      newErrors.port = "Port must be a number";
    }

    if (restartDelay && !/^\d+$/.test(restartDelay)) {
      newErrors.restartDelay = "Must be a number";
    }

    if (maxRestarts && !/^\d+$/.test(maxRestarts)) {
      newErrors.maxRestarts = "Must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const envObj: Record<string, string> = {};
    for (const pair of envPairs) {
      if (pair.key.trim()) {
        envObj[pair.key.trim()] = pair.value;
      }
    }

    const data: ServiceInput = {
      id: id.trim(),
      name: name.trim() || undefined,
      cmd: cmd.trim(),
      type,
      cwd: cwd.trim() || undefined,
      port: port ? parseInt(port, 10) : undefined,
      healthUrl: healthUrl.trim() || undefined,
      autoStart,
      autoRestart,
      restartDelay: restartDelay ? parseInt(restartDelay, 10) : undefined,
      maxRestarts: maxRestarts ? parseInt(maxRestarts, 10) : undefined,
      env: Object.keys(envObj).length > 0 ? envObj : undefined,
    };

    onSubmit(data);
  };

  const addEnvPair = () => {
    setEnvPairs([...envPairs, { key: "", value: "" }]);
  };

  const removeEnvPair = (index: number) => {
    setEnvPairs(envPairs.filter((_, i) => i !== index));
  };

  const updateEnvPair = (index: number, field: "key" | "value", value: string) => {
    setEnvPairs(envPairs.map((pair, i) =>
      i === index ? { ...pair, [field]: value } : pair
    ));
  };

  const inputStyle = {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    marginBottom: "4px",
    fontWeight: 500,
    color: colors.textPrimary,
    fontSize: 13,
  };

  const fieldStyle = {
    marginBottom: "16px",
  };

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          margin: "0 0 24px",
          fontSize: 24,
          fontWeight: 600,
          color: colors.textPrimary,
        }}
      >
        {isEditMode ? "Edit Service" : "Add Service"}
      </h1>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Name <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isEditMode}
            autoFocus={!isEditMode}
            placeholder="My Service"
            style={{
              ...inputStyle,
              borderColor: errors.name ? colors.danger : colors.border,
              opacity: isEditMode ? 0.6 : 1,
            }}
          />
          {errors.name && (
            <div style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
              {errors.name}
            </div>
          )}
          {!isEditMode && id && (
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontFamily: fonts.mono }}>
              tmux session: mgr-{"<project>"}-{id}
            </div>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Command <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            placeholder="npm run dev"
            style={{
              ...inputStyle,
              borderColor: errors.cmd ? colors.danger : colors.border,
            }}
          />
          {errors.cmd && (
            <div style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
              {errors.cmd}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 16, ...fieldStyle }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ServiceType)}
              style={inputStyle}
            >
              <option value="service">Service</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Working Directory</label>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="."
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, ...fieldStyle }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Port</label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="3000"
              style={{
                ...inputStyle,
                borderColor: errors.port ? colors.danger : colors.border,
              }}
            />
            {errors.port && (
              <div style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
                {errors.port}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Health URL</label>
            <input
              type="text"
              value={healthUrl}
              onChange={(e) => setHealthUrl(e.target.value)}
              placeholder="http://localhost:3000/health"
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 16,
            padding: "12px 0",
            borderTop: `1px solid ${colors.borderMuted}`,
            borderBottom: `1px solid ${colors.borderMuted}`,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              color: colors.textSecondary,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Auto Start
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              color: colors.textSecondary,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={autoRestart}
              onChange={(e) => setAutoRestart(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Auto Restart on Crash
          </label>
        </div>

        {autoRestart && (
          <div style={{ display: "flex", gap: 16, ...fieldStyle }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Restart Delay (ms)</label>
              <input
                type="text"
                value={restartDelay}
                onChange={(e) => setRestartDelay(e.target.value)}
                placeholder="3000"
                style={{
                  ...inputStyle,
                  borderColor: errors.restartDelay ? colors.danger : colors.border,
                }}
              />
              {errors.restartDelay && (
                <div style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
                  {errors.restartDelay}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Max Restarts</label>
              <input
                type="text"
                value={maxRestarts}
                onChange={(e) => setMaxRestarts(e.target.value)}
                placeholder="5"
                style={{
                  ...inputStyle,
                  borderColor: errors.maxRestarts ? colors.danger : colors.border,
                }}
              />
              {errors.maxRestarts && (
                <div style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
                  {errors.maxRestarts}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={fieldStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Environment Variables
            </label>
            <button
              type="button"
              onClick={addEnvPair}
              style={{
                ...buttonSecondary,
                padding: "4px 12px",
                fontSize: 12,
              }}
            >
              + Add
            </button>
          </div>
          {envPairs.map((pair, index) => (
            <div key={index} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={pair.key}
                onChange={(e) => updateEnvPair(index, "key", e.target.value)}
                placeholder="KEY"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="text"
                value={pair.value}
                onChange={(e) => updateEnvPair(index, "value", e.target.value)}
                placeholder="value"
                style={{ ...inputStyle, flex: 2 }}
              />
              <button
                type="button"
                onClick={() => removeEnvPair(index)}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  color: colors.danger,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              ...buttonPrimary,
              padding: "12px 24px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save Changes"
                : "Create Service"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...buttonSecondary,
              padding: "12px 24px",
            }}
          >
            Cancel
          </button>
        </div>

        {error && (
          <div style={{ color: colors.danger, marginTop: 12, fontSize: 13 }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
