---
title: Crazy nesting
description: The deep end. Cards inside cards, a construct in every card, callouts in cards, grids in collapsibles. None of this should appear in real docs, but it must not break.
---

## Cards inside cards

!!! cards { cols=2 }
    - **Outer one**

      !!! cards { cols=2 }
          - inner a
          - inner b
    - **Outer two**

      Just text, no surprises.

## A construct in every card

!!! cards { cols=2 }
    - **An accordion**

      !!! accordion
          - First question

            First answer.
          - Second question

            Second answer.
    - **A stepper**

      !!! steps
          1. one
          2. two
          3. three

## A callout inside a card

!!! cards
    - **Heads up card**

      !!! warning "Careful"
          This warning lives inside a card.
    - **A plain card**

      Nothing nested here.

## A card grid inside a collapsible

???+ note "Open me for a grid"
    !!! cards { cols=3 }
        - alpha
        - beta
        - gamma

## A stepper inside a collapsible callout

??? tip "The steps are hidden until you click"
    !!! steps "Reveal the routine"
        1. Sniff
        2. Climb
        3. Roll
