"use client";

import { useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";

type LoginResponse = { error?: string; next?: string };

export function LoginForm({ configured }: { configured: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          const result = (await response.json()) as LoginResponse;
          if (!response.ok || !result.next) {
            setError(result.error ?? "Sign-in could not be completed.");
            return;
          }
          window.location.assign(result.next);
        } catch {
          setError("Sign-in could not be completed. Please try again.");
        }
      })}
      className="space-y-5"
    >
      <div className="field">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="Enter your staff email"
            className="h-12 bg-background pl-10"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="field">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-12 bg-background pl-10 pr-12"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <button
            type="button"
            className="absolute right-0 top-0 flex size-12 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <m.p
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            role="alert"
            className="rounded-md bg-danger-soft p-3 text-sm leading-5 text-destructive"
          >
            {error}
          </m.p>
        )}
      </AnimatePresence>
      <Button
        type="submit"
        className="group h-12 w-full"
        disabled={isSubmitting || !configured}
      >
        {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
        {isSubmitting ? "Signing in…" : "Sign in"}
        {!isSubmitting && (
          <ArrowRight
            className="ml-1 size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        )}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Need access or help with your password? Contact the Super Administrator.
      </p>
    </form>
  );
}
