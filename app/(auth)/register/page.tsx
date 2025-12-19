"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";
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

// Registration schema (password identical to Change Password)
const registerSchema = z
  .object({
    firstName: z.string().min(1, { message: "First name is required." }),
    lastName: z.string().min(1, { message: "Last name is required." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .regex(/[A-Z]/, {
        message: "Must contain at least one uppercase letter (A-Z).",
      })
      .regex(/[0-9]/, { message: "Must contain at least one number (0-9)." })
      .regex(/[^a-zA-Z0-9]/, {
        message:
          "Must contain at least one special character (not a letter or number).",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Register, 2: OTP, 3: Success
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savedEmail, setSavedEmail] = useState("aa");

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");

  // Password strength checks
  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const strength =
    (hasLength ? 1 : 0) +
    (hasUppercase ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSpecial ? 1 : 0);
  const strengthLabels = ["Too Weak", "Weak", "Fair", "Good", "Strong"];

  // OTP state and refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

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

  async function onRegisterSubmit(values: RegisterValues) {
    setIsLoading(true);
    console.log("Register:", values);
    setSavedEmail(values.email);
    await new Promise((r) => setTimeout(r, 1500)); // Simulate API
    setIsLoading(false);
    setStep(2); // Proceed to OTP
  }

  async function onOtpSubmit() {
    const code = otp.join("");
    if (code.length !== 6) return;
    setIsLoading(true);
    console.log("OTP:", code);
    await new Promise((r) => setTimeout(r, 1500)); // Simulate verification
    setIsLoading(false);
    setStep(3); // Proceed to success
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Side: Large Image */}
      <div className="w-full relative hidden md:block">
        <div className="fixed w-1/2 pe-5">
          <Image
            src={"/images/logo.svg"}
            width={100}
            height={75}
            alt="logo"
            className="hidden md:block absolute z-20 ms-5 mt-5"
          />
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
        <div className="w-full max-w-md space-y-8 my-20">
          <Image
            src={"/images/logo.svg"}
            width={100}
            height={75}
            alt="logo"
            className="lg:hidden"
          />

          {/* Step 1: Registration Form */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Create your account
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fill in your details to get started.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onRegisterSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            First Name
                            <span className="-ms-1 pt-1 text-xl text-munchred">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="First Name"
                              className="h-12"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            Last Name
                            <span className="-ms-1 pt-1 text-xl text-munchred">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Last Name"
                              className="h-12"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                            className="h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password field with strength indicator (identical to Change Password) */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
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

                        <div className="mt-4 flex items-center gap-5 justify-between">
                          <div className="flex h-3 gap-2 w-full basis-6/7">
                            <div className="transition-all duration-300 rounded-full h-2 w-full bg-munchprimary" />
                            <div
                              className={`transition-all duration-300 rounded-full h-2 w-full ${
                                strength > 1 ? "bg-munchprimary" : "bg-gray-200"
                              }`}
                            />
                            <div
                              className={`transition-all duration-300 rounded-full h-2 w-full ${
                                strength > 2 ? "bg-munchprimary" : "bg-gray-200"
                              }`}
                            />
                            <div
                              className={`transition-all duration-300 rounded-full h-2 w-full ${
                                strength > 3 ? "bg-munchprimary" : "bg-gray-200"
                              }`}
                            />
                          </div>
                          <span className="text-sm whitespace-nowrap -mt-1">
                            {strengthLabels[strength]}
                          </span>
                        </div>

                        <ul className="mt-4 space-y-1 text-sm text-slate-500">
                          <li className="flex items-center gap-2">
                            {hasLength ? (
                              <Image
                                src={"/images/icon/CheckCircleSuccess.svg"}
                                width={20}
                                height={20}
                                alt="checked"
                              />
                            ) : (
                              <Image
                                src={"/images/icon/CheckCircle.svg"}
                                width={20}
                                height={20}
                                alt="unchecked"
                              />
                            )}
                            At least 8 characters
                          </li>
                          <li className="flex items-center gap-2">
                            {hasUppercase ? (
                              <Image
                                src={"/images/icon/CheckCircleSuccess.svg"}
                                width={20}
                                height={20}
                                alt="checked"
                              />
                            ) : (
                              <Image
                                src={"/images/icon/CheckCircle.svg"}
                                width={20}
                                height={20}
                                alt="unchecked"
                              />
                            )}
                            At least 1 uppercase character (A-Z)
                          </li>
                          <li className="flex items-center gap-2">
                            {hasNumber ? (
                              <Image
                                src={"/images/icon/CheckCircleSuccess.svg"}
                                width={20}
                                height={20}
                                alt="checked"
                              />
                            ) : (
                              <Image
                                src={"/images/icon/CheckCircle.svg"}
                                width={20}
                                height={20}
                                alt="unchecked"
                              />
                            )}
                            At least 1 number (0-9)
                          </li>
                          <li className="flex items-center gap-2">
                            {hasSpecial ? (
                              <Image
                                src={"/images/icon/CheckCircleSuccess.svg"}
                                width={20}
                                height={20}
                                alt="checked"
                              />
                            ) : (
                              <Image
                                src={"/images/icon/CheckCircle.svg"}
                                width={20}
                                height={20}
                                alt="unchecked"
                              />
                            )}
                            At least 1 special character (e.g., ! @ # $ % ^ & *
                            etc.)
                          </li>
                        </ul>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Confirm Password
                          <span className="-ms-1 pt-1 text-xl text-munchred">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Confirm Password"
                              className="h-12 placeholder:text-gray-400"
                              type={showConfirmPassword ? "text" : "password"}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                            >
                              {showConfirmPassword ? (
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

                  <Button
                    type="submit"
                    disabled={isLoading || strength < 4}
                    className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
                  >
                    {isLoading ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-munchprimary hover:text-munchprimaryDark hover:underline"
                >
                  Login
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
                  Enter the verification code we just sent to {savedEmail}
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
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-rubik flex items-center gap-3">
                  <span>Welcome Onboard!</span>
                  <Image
                    src={"/images/icon/CheckCircleSuccess.svg"}
                    width={25}
                    height={25}
                    alt="success icon"
                  />
                </h2>
                <p className="mt-2 text-sm text-muted-foreground mx-auto">
                  Let’s get you started and setup your store.
                </p>
              </div>

              <Link href="/setup-your-store" className="block">
                <Button className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full">
                  Continue to setup store
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
