"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { setAccessToken } from "@/app/lib/auth";

const API_BASE = "https://api.munchspace.io/api/v1";
const API_KEY =
  "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==";

// Step 1: Email + Password schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [step, setStep] = useState<1 | 2>(1); // 1: Login form, 2: OTP
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");
  const [otpError, setOtpError] = useState("");

  // Resend OTP logic
  const [resendCooldown, setResendCooldown] = useState(0); // seconds remaining
  const [currentWaitTime, setCurrentWaitTime] = useState(60); // initial 60 seconds

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Countdown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  async function onLoginSubmit(values: LoginValues) {
    setIsLoading(true);
    setOtpError("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      if (response.status === 200) {
        setSavedEmail(values.email);
        setStep(2);
        setResendCooldown(60); // Start initial 60-second cooldown
        setCurrentWaitTime(60);
      } else if (response.status === 401) {
        form.setError("root", { message: "Invalid email or password." });
      } else {
        form.setError("root", { message: "An unexpected error occurred." });
      }
    } catch (error) {
      form.setError("root", { message: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setOtpError("");

    try {
      const response = await fetch(`${API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          identifier: savedEmail,
        }),
      });

      if (response.ok) {
        setOtp(["", "", "", "", "", ""]); // Clear previous OTP input
        otpRefs.current[0]?.focus(); // Refocus first input

        // Exponential backoff: double the wait time
        const newWaitTime = currentWaitTime * 2;
        setCurrentWaitTime(newWaitTime);
        setResendCooldown(newWaitTime);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setOtpError(
          errorData.message || "Failed to resend OTP. Please try again."
        );
      }
    } catch (error) {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit() {
    const code = otp.join("");
    if (code.length !== 6) return;

    setIsLoading(true);
    setOtpError("");

    try {
      const response = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          identifier: savedEmail,
          otp: code,
        }),
      });

      if (response.status === 200) {
        const res = await response.json();
        const { accessToken, refreshToken } = res.data;

        // Save tokens only after successful OTP verification
        setAccessToken(accessToken);
        // localStorage.setItem("accessToken", accessToken);
        document.cookie = `refreshToken=${refreshToken}; path=/; secure; samesite=strict; max-age=${
          60 * 60 * 24 * 30
        }`;

        // Immediately redirect to dashboard
        window.location.href = "/restaurant/dashboard";
      } else if (response.status === 401) {
        setOtpError("Invalid or expired OTP.");
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    } catch (error) {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Side: Large Image */}
      <div className="w-full relative hidden md:block">
        <div className="fixed w-1/2 pe-5">
          <Link href="/">
            <Image
              src={"/images/logo.svg"}
              width={100}
              height={75}
              alt="logo"
              className="hidden md:block absolute z-20 ms-5 mt-5"
            />
          </Link>
          <Image
            src={"/images/auth/hero.png"}
            width={500}
            height={900}
            alt="hero"
            className="object-cover h-full max-h-screen w-full"
          />
        </div>
      </div>

      {/* Right Side: Multi-Step Form */}
      <div className="w-full flex items-center justify-center bg-background px-8">
        <div className="w-full max-w-md space-y-8">
          <Link href="/">
            <Image
              src={"/images/logo.svg"}
              width={100}
              height={75}
              alt="logo"
              className="md:hidden"
            />
          </Link>

          {/* Step 1: Email + Password */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Welcome back!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please sign in to continue.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onLoginSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Email
                          <span className="-ms-1 pt-1 text-xl text-munchred">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Email"
                            type="email"
                            className="h-12 placeholder:text-gray-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center font-normal text-slate-500">
                          Password
                          <span className="-ms-1 pt-1 text-xl text-munchred">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Password"
                              className="h-12 placeholder:text-gray-400"
                              type={showPassword ? "text" : "password"}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                            >
                              {showPassword ? (
                                <EyeOff size={20} />
                              ) : (
                                <Eye size={20} />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.formState.errors.root && (
                    <p className="text-sm text-red-500 text-center">
                      {form.formState.errors.root.message}
                    </p>
                  )}

                  <div className="flex items-center justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium underline text-munchprimary hover:text-munchprimaryDark hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
                  >
                    {isLoading ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium underline text-munchprimary hover:text-munchprimaryDark hover:underline"
                >
                  Signup
                </Link>
              </p>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Verify your email
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the verification code sent to {savedEmail}
                </p>
              </div>

              <div className="flex justify-between gap-3">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg"
                    maxLength={1}
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-sm text-red-500 text-center">{otpError}</p>
              )}

              <Button
                onClick={onOtpSubmit}
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
              >
                {isLoading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-munchprimary hover:text-munchprimaryDark p-0 h-auto font-medium"
                >
                  {resendCooldown > 0
                    ? `Resend OTP in ${formatTime(resendCooldown)}`
                    : "Resend OTP"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
