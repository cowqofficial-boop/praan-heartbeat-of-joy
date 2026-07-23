import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fixed?: boolean;
};

export function PrimaryButton({ children, fixed = false, className = "", ...rest }: Props) {
  const base =
    "flex h-14 w-full items-center justify-center rounded-[14px] bg-primary px-5 text-[16px] font-semibold text-primary-foreground transition-opacity disabled:opacity-50";
  if (!fixed) {
    return (
      <button {...rest} className={`${base} ${className}`}>
        {children}
      </button>
    );
  }
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 lg:static lg:mx-0 lg:max-w-none lg:p-0">
      <button
        {...rest}
        className={`${base} pointer-events-auto shadow-[0_1px_2px_rgba(17,17,17,0.06)] ${className}`}
      >
        {children}
      </button>
    </div>
  );
}

