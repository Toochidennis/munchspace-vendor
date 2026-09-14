"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";

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
import Image from "next/image";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { startRecovery } from "@/app/lib/auth-session";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = await startRecovery(values.email);

    setIsLoading(false);

    // The server answers the same way whether or not the address is
    // registered, so there is nothing here to branch on: showing anything
    // other than the confirmation would turn this screen into a way of
    // finding out which addresses have accounts.
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setEmailSent(true);
    toast.success("Reset link sent successfully");
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

      {/* Right Side: Form */}
      <div className="w-full flex items-center justify-center bg-background px-8">
        <div className="w-full max-w-md space-y-8">
          <Link href="/">
            <Image
              src={"/images/logo.svg"}
              width={100}
              height={75}
              alt="logo"
              className="lg:hidden"
            />
          </Link>
          {!emailSent && (
            <>
              <div className="">
                <h2 className="text-2xl font-bold tracking-tight font-rubik">
                  Forgot Password
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please enter your email to request a password reset
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
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

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full"
                  >
                    {isLoading ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-munchprimary hover:text-munchprimaryDark underline"
                >
                  Back to login
                </Link>
              </p>
            </>
          )}
          {emailSent && (
            <>
              <div className="">
                <h2 className="text-2xl font-bold tracking-tight font-rubik flex gap-3">
                  <span>Email Sent!</span>
                  <Image
                    src={"/images/CheckCircleSuccess.svg"}
                    width={25}
                    height={25}
                    alt="success icon"
                  />
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We have sent you an email with the reset instructions
                </p>
              </div>
              <Link href={"/login"} className="block mt-6">
                <Button className="w-full bg-munchprimary hover:bg-munchprimaryDark h-12 rounded-full hover:cursor-pointer">
                  Back to Login
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
