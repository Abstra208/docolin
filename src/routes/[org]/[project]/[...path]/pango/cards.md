---
title: Cards
description: A list inside !!! cards renders as a responsive grid. Control columns with { cols=N }, or omit it for an auto-fit grid.
---

Two columns, each card led by a link:

!!! cards { cols=2 }
    - [Get started](/pangos/jungle-gym/welcome)
      Set up in five minutes with the quickstart.
    - [Code bars](/pangos/jungle-gym/code)
      Every language shiki can highlight.

Three columns of plain content:

!!! cards { cols=3 }
    - **Fast** so readers stay.
    - **Typed** mdast all the way down.
    - **Yours** under AGPL, fork freely.

Auto-fit (no cols), as many columns as fit the width:

!!! cards
    - Ants
    - Termites
    - Grubs
    - Beetles
    - Larvae
