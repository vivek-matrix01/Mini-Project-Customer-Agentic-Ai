import { cn } from "../../lib/utils";
import React from "react";

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}) => {
  return (
    <main
      className={cn(
        "relative flex flex-col h-[100vh] w-full items-center justify-center bg-slate-100 dark:bg-zinc-900 text-slate-950 transition-bg",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            "filter blur-[10px] invert dark:invert-0 absolute -inset-[10px] opacity-80 will-change-transform",
            `[--white-gradient:repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)]`,
            `[--dark-gradient:repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)]`,
            `[--aurora:repeating-linear-gradient(100deg,#1d4ed8_10%,#4338ca_15%,#2563eb_20%,#6d28d9_25%,#1e40af_30%)]`,
            `[background-image:var(--white-gradient),var(--aurora)]`,
            `dark:[background-image:var(--dark-gradient),var(--aurora)]`,
            `[background-size:300%,_200%]`,
            `[background-position:50%_50%,50%_50%]`,
            `after:content-[''] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)]`,
            `after:dark:[background-image:var(--dark-gradient),var(--aurora)]`,
            `after:[background-size:200%,_100%]`,
            `after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference`,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
          )}
        ></div>
      </div>
      <div className="relative z-10 w-full flex align-center justify-center h-full auto-rows-min">{children}</div>
    </main>
  );
};
