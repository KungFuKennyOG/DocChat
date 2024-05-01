'use client'
import { createTheme } from "@mui/material";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400"]})

export const defaultTheme = createTheme({
  typography: {
    fontFamily: poppins.style.fontFamily,
  },
});