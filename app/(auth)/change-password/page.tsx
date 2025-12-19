"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
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

// Password validation schema (unchanged)
const formSchema = z
  .object({
    newPassword: z
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
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function ChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Watch newPassword for real-time checks
  const newPassword = form.watch("newPassword");

  // Individual checks (order: length, uppercase, number, special)
  const hasLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

  // Strength score
  const strength =
    (hasLength ? 1 : 0) +
    (hasUppercase ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSpecial ? 1 : 0);
  const strengthLabels = ["Too Weak", "Weak", "Fair", "Good", "Strong"];

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    console.log(values);
    await new Promise((r) => setTimeout(r, 1500)); // Simulate API call
    // Integrate with your password change API here
      setIsLoading(false);
      setPasswordChanged(true)
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Side: Large Image */}
      <div className="w-full relative hidden md:block">
        <Image
          src={"/images/logo.png"}
          width={100}
          height={75}
          alt="logo"
          className="hidden md:block absolute ms-5 mt-5"
        />
        <Image
          src={"/images/auth/hero.png"}
          width={500}
          height={900}
          alt="hero"
          className="object-cover h-full w-full max-h-screen"
        />
      </div>

      {/* Right Side: Change Password Form */}
      <div className="w-full flex items-center justify-center bg-background px-8">
        {!passwordChanged && (
          <div className="w-full max-w-md space-y-8">
            <Image
              src={"/images/logo.png"}
              width={100}
              height={75}
              alt="logo"
              className="lg:hidden"
            />
            <div className="">
              <h2 className="text-2xl font-bold tracking-tight font-rubik">
                Change Password
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your new password below.
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        New Password
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="New Password"
                            className="h-12 placeholder:text-gray-400"
                            type={showNewPassword ? "text" : "password"}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                          >
                            {showNewPassword ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />

                      {/* Single-Line Segmented Progress Bar */}
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

                      {/* Requirements Checklist */}
                      <ul className="mt-4 space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          {hasLength ? (
                            <Image
                              src={"/images/icon/CheckCircleSuccess.png"}
                              width={20}
                              height={20}
                              alt="checked"
                            />
                          ) : (
                            <Image
                              src={"/images/icon/CheckCircle.png"}
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
                              src={"/images/icon/CheckCircleSuccess.png"}
                              width={20}
                              height={20}
                              alt="checked"
                            />
                          ) : (
                            <Image
                              src={"/images/icon/CheckCircle.png"}
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
                              src={"/images/icon/CheckCircleSuccess.png"}
                              width={20}
                              height={20}
                              alt="checked"
                            />
                          ) : (
                            <Image
                              src={"/images/icon/CheckCircle.png"}
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
                              src={"/images/icon/CheckCircleSuccess.png"}
                              width={20}
                              height={20}
                              alt="checked"
                            />
                          ) : (
                            <Image
                              src={"/images/icon/CheckCircle.png"}
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
                      <FormLabel>
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
                    "Request reset"
                  )}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-munchprimary hover:text-munchprimaryDark underline"
              >
                Back to Login
              </Link>
            </p>
          </div>
        )}
        {passwordChanged && (
          <div>
            <div className="">
              <h2 className="text-2xl font-bold tracking-tight font-rubik flex gap-3">
                <span>All Done!</span>
                <Image
                  src={"/images/icon/CheckCircleSuccess.png"}
                  width={25}
                  height={25}
                  alt="success icon"
                />
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-96">
                Your password has been successfully changed. You can now proceed
                to the login page with your new password.
              </p>
            </div>
            <Link href={"/login"} className="mt-8 block">
              <Button
                type="submit"
                className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full hover:cursor-pointer"
              >
                Back to Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
