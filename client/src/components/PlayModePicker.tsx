import React from 'react';

export interface PlayMode {
  key: string;
  tone: 'host' | 'join' | 'local';
  icon: string;
  title: string;
  hint: string;
  onClick: () => void;
}

interface PlayModePickerProps {
  modes: PlayMode[];
  question?: string;
}

/** Selector visual de "cómo quieres jugar" (sala, unirse o mismo dispositivo),
 * compartido por todos los juegos para que sea lo primero que se pregunta. */
export default function PlayModePicker({ modes, question = '¿Cómo quieres jugar?' }: PlayModePickerProps) {
  return (
    <section className="mode-picker">
      <h2 className="mode-picker-title">{question}</h2>
      <div className="mode-grid">
        {modes.map((mode) => (
          <button
            key={mode.key}
            type="button"
            className={`mode-tile mode-tile-${mode.tone}`}
            onClick={mode.onClick}
          >
            <span className="mode-tile-icon">{mode.icon}</span>
            <span className="mode-tile-title">{mode.title}</span>
            <span className="mode-tile-hint">{mode.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
