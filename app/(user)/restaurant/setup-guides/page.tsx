"use client";

import { CheckCircle2, Circle, CircleDashed, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { use, useState } from "react";

export default function SetupGuidePage() {
  const tasks = [
    {
      title: "Add Store Details",
      description:
        "Provide your store name, address, hours and basic informations.",
      completed: true,
      actionLabel: "Add details",
      href: "/restaurant/dashboard",
    },
    {
      title: "Complete KYC Verification",
      description:
        "Submit required documents so Munchspace can verify your business and unlock full features.",
      completed: true,
      actionLabel: "Begin KYC",
      href: "/restaurant/dashboard",
    },
    {
      title: "Add Settlement Account",
      description:
        "Provide the bank account where your earnings should be deposited. (Munchspace handles customer payments.)",
      completed: true,
      actionLabel: "Add account",
      href: "/restaurant/dashboard",
    },
    {
      title: "Add 3+ Menu Items",
      description:
        "List at least three dishes or products with names, prices and photos so customers can order.",
      completed: false,
      actionLabel: "Add items",
      href: "/restaurant/dashboard",
    },
    {
      title: "Set Charges & Fees",
      description:
        "Define packaging or service fees so prices stay clear and accurate.",
      completed: false,
      actionLabel: "Add charges",
      href: "/restaurant/dashboard",
    }
  ];

  let [modifiedTasks, setModifiedTasks] = useState(tasks);

  const progress = Number(
    (
      (tasks.filter((task) => task.completed).length / tasks.length) *
      100
    ).toFixed(0)
  );

  function deleteTaskByTitle(title: string) {
    setModifiedTasks(modifiedTasks.filter((task) => task.title !== title));
  }
  return (
    <div className="min-h-screen">
      <div className="px-5 md:px-15 py-12 mt-5 md:mt-0">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-4">Setup Guide</h1>
        <p className="text-slate-700 mb-2">
          Complete the steps below and finish your KYC verification to reach 60%
          setup. Once you hit that mark, your store goes live and shoppers can
          view your products and place orders from our mobile app.
        </p>
        <p className="text-slate-700 mb-8">
          <Link href={"#"} className="text-blue-500">
            Need assistance?
          </Link>{" "}
          Our team is ready to help.
        </p>

        {/* Progress Bar */}
        <div className="flex items-center gap-4 mb-12">
          <Progress value={progress} className="flex-1 h-2 bg-gray-200">
            <div
              className="h-full bg-munchprimary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </Progress>
          <span className="text-sm text-blue-500 font-medium">
            {progress}% completed
          </span>
        </div>

        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modifiedTasks.map((task, index) => (
            <div
              key={index}
              className="text-black rounded-2xl p-6 flex flex-col justify-between border border-gray-100"
            >
              <div className="flex items-start gap-3">
                {task.completed ? (
                  <Image
                    src="/images/CheckCircleSuccess.svg"
                    alt="Completed"
                    width={27}
                    height={27}
                  />
                ) : (
                  <CircleDashed className="h-6 w-6 text-slate-700 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {task.description}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                {!task.completed ? (
                  <Link href={task.href}>
                    <Button
                      variant={task.completed ? "outline" : "default"}
                      className="rounded-full bg-munchprimary hover:bg-orange-600 text-white"
                    >
                      <span>{task.actionLabel}</span>
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant={task.completed ? "outline" : "default"}
                    className={cn(
                      "rounded-full",
                      task.completed
                        ? " bg-gray-100 border-gray-100"
                        : "bg-munchprimary hover:bg-orange-600 text-white"
                    )}
                  >
                    <div
                      onClick={() => deleteTaskByTitle(task.title)}
                      className="flex items-center gap-2 text-slate-700"
                    >
                      <X />
                      <span>Dismiss</span>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
