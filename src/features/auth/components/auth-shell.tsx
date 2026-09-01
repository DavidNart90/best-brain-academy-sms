"use client";

import Image from "next/image";
import { LazyMotion, domAnimation, useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";
import { ShieldCheck } from "lucide-react";
import classroomImage from "@/app/public/classroom-login.jpg";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <LazyMotion features={domAnimation} strict>
      <main className="flex min-h-dvh items-center justify-center bg-canvas sm:p-4 lg:p-7">
        <div className="grid min-h-dvh w-full overflow-hidden bg-card sm:min-h-[calc(100dvh-2rem)] sm:max-w-[1240px] sm:rounded-2xl sm:border sm:border-border sm:shadow-[0_24px_80px_rgba(37,31,30,0.12)] lg:min-h-[min(760px,calc(100dvh-3.5rem))] lg:grid-cols-[1.12fr_0.88fr]">
          <section className="relative hidden min-h-0 overflow-hidden bg-auth-panel text-white lg:block">
            <m.div
              initial={reduceMotion ? false : { scale: 1.035 }}
              animate={{ scale: 1 }}
              transition={{ ...transition, duration: reduceMotion ? 0 : 1.1 }}
              className="absolute inset-0"
            >
              <Image
                src={classroomImage}
                alt="A teacher leading students in a modern classroom"
                fill
                className="object-cover object-[58%_center]"
                sizes="(min-width: 1024px) 56vw, 0px"
                priority
              />
            </m.div>
            <div
              className="absolute inset-0 bg-[#241715]/58"
              aria-hidden="true"
            />
            <div
              className="absolute inset-5 border border-white/15"
              aria-hidden="true"
            />

            <div className="relative flex h-full min-h-[700px] flex-col justify-between p-12 xl:p-14">
              <m.div
                initial={reduceMotion ? false : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={transition}
                className="relative flex w-fit items-center gap-4 overflow-hidden rounded-lg border border-white/75 bg-white/95 p-3 pr-5 text-foreground shadow-[0_14px_38px_rgba(20,12,11,0.28)] backdrop-blur-sm"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1 bg-primary"
                  aria-hidden="true"
                />
                <span className="flex size-[4.5rem] items-center justify-center">
                  <Image
                    src="/api/branding/logo"
                    alt="Best Brain Academy crest"
                    width={1254}
                    height={1254}
                    className="size-[4.5rem] object-contain drop-shadow-[0_6px_10px_rgba(65,31,27,0.14)]"
                    sizes="72px"
                    unoptimized
                    priority
                  />
                </span>
                <span className="border-l border-border pl-4 pr-1">
                  <strong className="block text-base font-bold tracking-[-0.02em]">
                    Best Brain Academy
                  </strong>
                  <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    School Management System
                  </span>
                </span>
              </m.div>

              <m.div
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transition, delay: reduceMotion ? 0 : 0.12 }}
                className="max-w-[480px] pb-1"
              >
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#f3b6b2]">
                  Service with diligence
                </p>
                <h2 className="max-w-[460px] text-[3.25rem] font-semibold leading-[1.02] tracking-[-0.045em] xl:text-[3.65rem]">
                  Built for the rhythm of every school day.
                </h2>
                <p className="mt-6 max-w-md text-sm leading-6 text-white/76">
                  A private workspace for the people who keep learning, records,
                  and school operations moving forward.
                </p>
                <p className="mt-8 flex items-center gap-2 border-t border-white/20 pt-5 text-xs text-white/65">
                  <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
                  Authorized staff access only
                </p>
              </m.div>
            </div>
          </section>

          <section className="flex min-h-dvh flex-col bg-card sm:min-h-[calc(100dvh-2rem)] lg:min-h-0">
            <m.header
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition}
              className="flex items-center gap-3 border-b border-border px-5 py-4 lg:hidden"
            >
              <span className="flex size-14 items-center justify-center">
                <Image
                  src="/api/branding/logo"
                  alt="Best Brain Academy crest"
                  width={1254}
                  height={1254}
                  className="size-14 object-contain drop-shadow-[0_4px_8px_rgba(78,35,32,0.12)]"
                  sizes="56px"
                  unoptimized
                  priority
                />
              </span>
              <span>
                <strong className="block text-sm font-semibold tracking-tight">
                  Best Brain Academy
                </strong>
                <span className="text-xs text-muted-foreground">
                  School Management System
                </span>
              </span>
            </m.header>

            <m.div
              initial={reduceMotion ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition, delay: reduceMotion ? 0 : 0.08 }}
              className="flex flex-1 items-center justify-center px-5 py-9 sm:px-10 lg:px-12 xl:px-16"
            >
              <div className="w-full max-w-[400px]">{children}</div>
            </m.div>
          </section>
        </div>
      </main>
    </LazyMotion>
  );
}
