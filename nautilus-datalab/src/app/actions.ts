"use server";

import db, { getAllRobots, RobotDB, saveRobot, savePortfolio, getAllPortfolios } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function actionSaveRobot(robotId: string, name: string, stats: any, jsonData: any) {
  try {
    saveRobot({ id: robotId, name, stats, json_data: jsonData });
    revalidatePath("/estrutura");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actionGetRobots() {
  try {
    return { success: true, robots: getAllRobots() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actionSavePortfolio(portfolio: any) {
  try {
    savePortfolio(portfolio);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actionGetPortfolios() {
  try {
    return { success: true, portfolios: getAllPortfolios() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
