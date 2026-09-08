"use client";

import { useState } from "react";

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  timezone: string;
  language: string;
  createdAt: string;
  twoFactorConfig?: { enabled: boolean } | null;
  accounts?: Array<{
    id: string;
    provider: string;
    providerEmail: string | null;
    createdAt: string;
  }>;
}

export function ProfileClient({
  initialUser,
  slug,
  orgName,
  userRole,
}: {
  initialUser: UserProfileData;
  slug: string;
  orgName: string;
  userRole: string;
}) {
  const [user, setUser] = useState<UserProfileData>(initialUser);
  const [name, setName] = useState(initialUser.name || "");
  const [handle, setHandle] = useState(
    initialUser.email ? (initialUser.email.split("@")[0] || "alex.vance").toLowerCase() : "alex.vance"
  );
  const [email] = useState(initialUser.email || "");
  const [bio, setBio] = useState(
    "Ingeniero de Sistemas Principales enfocado en arquitecturas distribuidas de baja latencia y protocolos de consenso orientados a fallos."
  );
  const [timezone, setTimezone] = useState(initialUser.timezone || "America/Mexico_City");
  const [language, setLanguage] = useState(initialUser.language || "es");
  const [website, setWebsite] = useState("https://zenforge.online");

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Integrations state (demo toggles)
  const [integrations, setIntegrations] = useState<{ [key: string]: boolean }>({
    github: true,
    discord: false,
    slack: true,
    google: true,
  });

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo actualizar el perfil");
      }

      const json = await res.json();
      if (json.data) {
        setUser((prev) => ({ ...prev, ...json.data }));
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setName(user.name || "");
    setTimezone(user.timezone || "America/Mexico_City");
    setLanguage(user.language || "es");
    setSavedSuccess(false);
    setSaveError(null);
  };

  return (
    <div className="w-full bg-[#0b0d0e] text-[#e2e2e2] min-h-screen pb-20 font-sans">
      {/* HEADER BANNER PERSONALIZABLE */}
      <div className="relative w-full h-52 md:h-64 bg-gradient-to-r from-[#0d1527] via-[#101b36] to-[#0a1120] border-b border-[#23272f] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        <div className="absolute top-4 right-6 flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[#161a20]/80 hover:bg-[#1f242c] text-[#9ca3af] hover:text-white border border-[#2b313a] rounded transition-all backdrop-blur-md"
            onClick={() => alert("Función para cambiar banner en desarrollo")}
          >
            <span className="material-symbols-outlined text-[16px]">image</span>
            <span>Cambiar Banner</span>
          </button>
        </div>

        {/* Acciones Superiores de Guardado Flotantes */}
        <div className="absolute bottom-4 right-6 hidden sm:flex items-center gap-3 z-10">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-4 py-2 text-xs font-mono tracking-wider uppercase text-[#9ca3af] hover:text-white bg-[#121417]/80 hover:bg-[#1a1d22] border border-[#2b313a] rounded transition-colors"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-mono tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-medium rounded shadow-lg shadow-blue-600/20 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
          </button>
        </div>
      </div>

      {/* AVATAR + DATOS PRINCIPALES DE CABECERA */}
      <div className="max-w-6xl mx-auto px-6 -mt-16 md:-mt-20 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#23272f]">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="relative group">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl bg-[#161a22] border-2 border-[#2b313a] shadow-2xl flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-5xl font-bold font-mono text-blue-500">
                    {user.name?.slice(0, 1)?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0b0d0e]" title="En línea" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{name}</h1>
                <span className="px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider bg-blue-950/60 text-blue-400 border border-blue-800/40 rounded">
                  {userRole}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-mono text-[#9ca3af] bg-[#161a22] border border-[#2b313a] rounded">
                  CORE ARCHITECT
                </span>
              </div>
              <p className="text-sm font-mono text-[#9ca3af]">@{handle} • {orgName}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[#6b7280]">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                <span>Miembro desde {new Date(user.createdAt).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:hidden">
            <button
              type="button"
              onClick={handleDiscard}
              className="flex-1 py-2 text-xs font-mono uppercase text-[#9ca3af] bg-[#161a22] border border-[#2b313a] rounded"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-xs font-mono uppercase text-white bg-blue-600 rounded font-medium"
            >
              {saving ? "..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* MENSAJES DE ALERTA */}
        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-mono flex items-center gap-2 rounded">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Perfil actualizado correctamente en la base de datos de ZenWork.</span>
          </div>
        )}
        {saveError && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-mono flex items-center gap-2 rounded">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{saveError}</span>
          </div>
        )}

        {/* GRID DE SECCIONES PRINCIPALES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* COLUMNA IZQUIERDA Y CENTRAL: IDENTIDAD & DATOS DE VISUALIZACIÓN */}
          <div className="lg:col-span-2 space-y-8">
            {/* SECCIÓN 1: IDENTIDAD */}
            <div className="bg-[#121518] border border-[#23272f] rounded-lg p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#23272f]">
                <div>
                  <h2 className="text-base font-semibold text-white">Identidad & Datos de Visualización</h2>
                  <p className="text-xs text-[#9ca3af]">Gestiona cómo eres visible para los miembros de la organización.</p>
                </div>
                <span className="material-symbols-outlined text-[#6b7280]">badge</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-[#9ca3af]">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#181c22] border border-[#2b313a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-[#9ca3af]">
                    Nombre de Usuario (Handle)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono text-[#6b7280]">@</span>
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      className="w-full bg-[#181c22] border border-[#2b313a] rounded pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="usuario"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono uppercase text-[#9ca3af]">
                      Correo Electrónico Principal
                    </label>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      <span>VERIFICADO</span>
                    </span>
                  </div>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-[#14171d] border border-[#23272f] rounded px-3 py-2 text-sm text-[#9ca3af] cursor-not-allowed font-mono"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-[#9ca3af]">
                    Biografía / Estado Rápido (Markdown soportado)
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-[#181c22] border border-[#2b313a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans resize-none"
                    placeholder="Escribe algo sobre tus responsabilidades o proyectos actuales..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-[#9ca3af]">
                    Zona Horaria
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#181c22] border border-[#2b313a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  >
                    <option value="America/Mexico_City">UTC-06:00 (Ciudad de México)</option>
                    <option value="America/Bogota">UTC-05:00 (Bogotá / Lima / Quito)</option>
                    <option value="America/Santiago">UTC-04:00 (Santiago de Chile)</option>
                    <option value="America/Argentina/Buenos_Aires">UTC-03:00 (Buenos Aires)</option>
                    <option value="Europe/Madrid">UTC+01:00 (Madrid / Barcelona)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-[#9ca3af]">
                    Idioma de la Interfaz
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#181c22] border border-[#2b313a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  >
                    <option value="es">Español (Latinoamérica / España)</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-[#9ca3af]">
                    Sitio Web / Portafolio Profesional
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[16px] text-[#6b7280]">
                      language
                    </span>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full bg-[#181c22] border border-[#2b313a] rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                      placeholder="https://tudominio.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: SEGURIDAD & SESIONES ACTIVAS */}
            <div className="bg-[#121518] border border-[#23272f] rounded-lg p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#23272f]">
                <div>
                  <h2 className="text-base font-semibold text-white">Seguridad & Sesiones Activas</h2>
                  <p className="text-xs text-[#9ca3af]">Supervisa los métodos de autenticación y terminales autorizadas.</p>
                </div>
                <span className="material-symbols-outlined text-[#6b7280]">lock_clock</span>
              </div>

              {/* 2FA Card */}
              <div className="flex items-center justify-between p-4 bg-[#181c22] border border-[#2b313a] rounded-lg">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded bg-blue-950/40 border border-blue-800/40 flex items-center justify-center text-blue-400">
                    <span className="material-symbols-outlined text-[20px]">security</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <span>Autenticación de Dos Factores (TOTP)</span>
                      {user.twoFactorConfig?.enabled ? (
                        <span className="px-1.5 py-0.2 bg-emerald-950/60 text-emerald-400 text-[10px] font-mono rounded border border-emerald-800/40">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-amber-950/60 text-amber-400 text-[10px] font-mono rounded border border-amber-800/40">
                          NO CONFIGURADO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9ca3af]">Añade una capa de seguridad criptográfica con Google Authenticator o 1Password.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Para configurar 2FA utiliza la sección de seguridad de autenticación.")}
                  className="px-3 py-1.5 text-xs font-mono bg-[#222731] hover:bg-[#2c3340] text-white border border-[#333a48] rounded transition-colors"
                >
                  Configurar
                </button>
              </div>

              {/* Terminales autorizadas */}
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-[#9ca3af]">
                  Dispositivos y Terminales Autorizadas
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-[#15181e] border border-[#23272f] rounded">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#9ca3af] text-[20px]">laptop_mac</span>
                      <div>
                        <div className="text-xs font-mono text-white flex items-center gap-2">
                          <span>ZenWork Web Console (Linux / Chrome)</span>
                          <span className="px-1 py-0.2 bg-blue-950/80 text-blue-400 text-[9px] rounded font-mono">ESTA SESIÓN</span>
                        </div>
                        <p className="text-[11px] text-[#6b7280] font-mono">Última actividad: hace un momento • 206.183.130.172</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">EN LÍNEA</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#15181e] border border-[#23272f] rounded">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#6b7280] text-[20px]">smartphone</span>
                      <div>
                        <div className="text-xs font-mono text-[#d1d5db]">ZenWork Mobile App (iOS)</div>
                        <p className="text-[11px] text-[#6b7280] font-mono">Última sincronización: hace 2 horas • CDMX</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert("Sesión finalizada.")}
                      className="text-xs font-mono text-red-400 hover:text-red-300 hover:underline"
                    >
                      Revocar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: INTEGRACIONES Y AUDITORÍA */}
          <div className="space-y-8">
            {/* INTEGRACIONES DE CUENTA */}
            <div className="bg-[#121518] border border-[#23272f] rounded-lg p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#23272f]">
                <div>
                  <h2 className="text-base font-semibold text-white">Integraciones</h2>
                  <p className="text-xs text-[#9ca3af]">Sincronización con herramientas de desarrollo.</p>
                </div>
                <span className="material-symbols-outlined text-[#6b7280]">hub</span>
              </div>

              <div className="space-y-3.5">
                {/* GitHub */}
                <div className="flex items-center justify-between p-3 bg-[#181c22] border border-[#2b313a] rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white border border-[#333]">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">GitHub</div>
                      <p className="text-[10px] font-mono text-emerald-400">CONECTADO // @alexvance</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIntegrations((prev) => ({ ...prev, github: !prev.github }))}
                    className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                      integrations.github
                        ? "bg-blue-950/60 text-blue-400 border-blue-800/40"
                        : "bg-[#222] text-[#888] border-[#333]"
                    }`}
                  >
                    {integrations.github ? "Activo" : "Conectar"}
                  </button>
                </div>

                {/* Discord */}
                <div className="flex items-center justify-between p-3 bg-[#181c22] border border-[#2b313a] rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2] border border-[#5865F2]/30">
                      <span className="material-symbols-outlined text-[18px]">forum</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Discord Bot</div>
                      <p className="text-[10px] font-mono text-[#6b7280]">Notificaciones de canales</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIntegrations((prev) => ({ ...prev, discord: !prev.discord }))}
                    className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                      integrations.discord
                        ? "bg-blue-950/60 text-blue-400 border-blue-800/40"
                        : "bg-[#222731] text-[#9ca3af] border-[#333a48]"
                    }`}
                  >
                    {integrations.discord ? "Activo" : "Vincular"}
                  </button>
                </div>

                {/* Slack */}
                <div className="flex items-center justify-between p-3 bg-[#181c22] border border-[#2b313a] rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#E01E5A]/10 flex items-center justify-center text-[#E01E5A] border border-[#E01E5A]/30">
                      <span className="material-symbols-outlined text-[18px]">tag</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Slack Workspace</div>
                      <p className="text-[10px] font-mono text-emerald-400">CONECTADO // #zenwork-feed</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIntegrations((prev) => ({ ...prev, slack: !prev.slack }))}
                    className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                      integrations.slack
                        ? "bg-blue-950/60 text-blue-400 border-blue-800/40"
                        : "bg-[#222] text-[#888] border-[#333]"
                    }`}
                  >
                    {integrations.slack ? "Activo" : "Conectar"}
                  </button>
                </div>

                {/* Google Workspace */}
                <div className="flex items-center justify-between p-3 bg-[#181c22] border border-[#2b313a] rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#4285F4]/10 flex items-center justify-center text-[#4285F4] border border-[#4285F4]/30">
                      <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Google Calendar</div>
                      <p className="text-[10px] font-mono text-emerald-400">SINCRONIZADO</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIntegrations((prev) => ({ ...prev, google: !prev.google }))}
                    className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                      integrations.google
                        ? "bg-blue-950/60 text-blue-400 border-blue-800/40"
                        : "bg-[#222] text-[#888] border-[#333]"
                    }`}
                  >
                    {integrations.google ? "Activo" : "Conectar"}
                  </button>
                </div>
              </div>
            </div>

            {/* AUDITORÍA Y REGISTRO EN TIEMPO REAL */}
            <div className="bg-[#121518] border border-[#23272f] rounded-lg p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#23272f]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400 text-[18px]">terminal</span>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-white">audit_log.dump</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">● LIVE FEED</span>
              </div>

              <div className="space-y-2 font-mono text-[11px] text-[#9ca3af] bg-[#090b0d] p-3 rounded border border-[#1b1f26] overflow-x-auto">
                <div className="text-blue-400/90">&gt; [AUTH] Session renewed for uid:{user.id.slice(0, 8)}...</div>
                <div className="text-emerald-400/80">&gt; [ORG] Context loaded: /{slug} role={userRole}</div>
                <div className="text-[#6b7280]">&gt; [SYNC] Socket subscription ready [ws://event-bus]</div>
                <div className="text-[#6b7280]">&gt; [SEC] Key fingerprint verified SHA256:49f1a...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
