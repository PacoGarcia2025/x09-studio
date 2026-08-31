import Image from "next/image";

type X09RobotProps = {
  compact?: boolean;
};

/** Mascote oficial X09 — mesma imagem da landing x09.com.br */
export function X09Robot({ compact = false }: X09RobotProps) {
  const size = compact ? 176 : 480;

  return (
    <div
      className={`x09-mascot-wrap ${compact ? "x09-mascot-compact" : ""}`}
      aria-label="Robô X09 trabalhando"
    >
      <div className="x09-mascot-glow" aria-hidden />
      <div className="x09-mascot-orbit" aria-hidden />
      <Image
        src="/landing/x09-robot-mascot.png"
        alt="Robô X09"
        width={size}
        height={size}
        priority={!compact}
        className="x09-mascot-img"
      />
    </div>
  );
}
