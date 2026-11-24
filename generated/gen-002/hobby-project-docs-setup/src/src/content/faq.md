---
title: FAQ
---

# FAQ

## Does it need an internet connection?

No. Atomic weights, isotope data, and electron configurations are bundled with the plugin.

## Where do the isotope abundances come from?

They come from the same dataset as [:Isotopes](ref:isotopes). For a sample, see the [isotope table](ref:isotopes-table).

## Which atomic weights are used?

The standard atomic weights published by IUPAC. Where IUPAC gives a range instead of a single value, the plugin uses the conventional value and notes that in the lookup window.

## Why does :ElementMass differ from my textbook?

Textbooks often round atomic weights before multiplying. elemental.nvim keeps full precision and rounds only the final result, so the last digit can differ. To match your textbook, change `precision` in [Configuration options](ref:configuration-options).
