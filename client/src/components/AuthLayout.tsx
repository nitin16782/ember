import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F3EE] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs tracking-[0.2em] text-[#7A5C0F] font-bold mb-2">FIREBRICK</div>
          <h1 className="font-['Georgia',serif] text-4xl font-bold text-[#1A3A5C]">{title}</h1>
          {subtitle && <p className="mt-3 text-sm text-[#5C5C5C]">{subtitle}</p>}
        </div>
        <div className="bg-white border border-[#D9D2C2] rounded-lg p-6 sm:p-8 shadow-sm">
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-[#5C5C5C]">{footer}</div>}
        <div className="mt-12 text-center text-xs text-[#5C5C5C] italic">
          Sevā · Siddhi · Sukham
        </div>
      </div>
    </div>
  );
}
