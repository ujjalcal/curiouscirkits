---
name: domain-search
description: |
  Search for available domain names across multiple TLDs and show pricing.
  Starts by understanding what the user is building and their budget, then
  searches intelligently using AWS Route 53. Conversational, not robotic.
  Use when the user asks to "search for a domain", "find a domain", "check if
  a domain is available", "domain search", "what domains are available for",
  "cheapest domain", "domain under $X", or mentions buying/registering a domain.
---

# Domain Search

Help users find the perfect domain name. Understand first, search smart, recommend well.

## Phase 1: Understand (ask before searching)

Before running any search, gather context. Ask questions ONE AT A TIME via AskUserQuestion.
Never assume a name from the user's git config, email, or system context. Always ask.

### Question 1: What's it for?

Ask: "What are you building this portfolio for?"

Options:
- A) College applications — need to look professional
- B) Job hunting / internships — need to stand out
- C) Side project / creative work — want something fun and memorable
- D) Just experimenting — want the cheapest option

### Question 2: Name ideas

Ask: "What name do you want for your domain?"

If they're not sure, offer to help brainstorm. Ask about their name, project, or what
they do. Suggest 5-8 options across styles (full name, short name, creative, role-based).
Let them pick or type their own.

Clean up the input: lowercase, remove spaces/special chars except hyphens, strip any TLD.

### Question 3: Budget

Ask: "What's your budget for the domain?"

Options:
- A) Under $5/year — cheapest possible
- B) Under $10/year — good value
- C) Under $20/year — includes .com
- D) Don't care about price — show me the best options

### Skip questions if context is clear

If the user already provided name AND budget (e.g., "search for reyanmakes under $10"),
skip answered questions. Only ask what's missing.

If the user says "just search" or seems impatient, skip to Phase 2 with defaults.

## Phase 2: Search

Run the search script. The script handles pricing cache, parallel checks, formatting.

```bash
# Base path for the script
SCRIPT=".claude/skills/domain-search/scripts/search.sh"

# Default search (9 popular TLDs)
$SCRIPT <name>

# Budget search (all TLDs under $X)
$SCRIPT <name> --budget <amount>

# Specific TLDs
$SCRIPT <name> --tlds com,xyz,me

# Include name variations (my-name, the-name, name-dev, etc.)
$SCRIPT <name> --variants

# Combine: budget + variants
$SCRIPT <name> --budget 10 --variants

# All 365 TLDs (slow, use sparingly)
$SCRIPT <name> --all
```

### Map user answers to script flags:

| Budget answer | Script flag |
|---|---|
| Under $5/year | `--budget 5` |
| Under $10/year | `--budget 10` |
| Under $20/year | `--budget 20` |
| Don't care | (no flag, default 9 TLDs) |

If .com is taken in the results, add `--variants` and re-run to suggest alternatives.

## Phase 3: Recommend

After showing results, give a specific recommendation based on their Phase 1 answers:

- **College applications**: "For college apps, .com looks the most professional.
  If it's taken, .me is perfect for a personal portfolio."
- **Job hunting**: "Recruiters trust .com. If budget is tight, .link or .xyz
  still look professional on a resume."
- **Side project**: ".xyz or .click are fun and cheap. Save money for what matters."
- **Experimenting**: "Grab .click for $3. If you love it, upgrade to .com later."

## Phase 4: Iterate

If the user doesn't like any results:
- Offer to brainstorm different names
- Try variations: `$SCRIPT <name> --variants`
- Expand budget: "Want me to show options up to $20/year?"
- Try a completely different name

Keep going until they find one they like.

## Phase 5: Hand off

After they pick a domain: "Run `/domain-purchase` to register it and connect it to your portfolio."

This skill only searches. It never registers or charges anything.

## Requirements

- AWS CLI configured with Route 53 access
- IAM permissions: `AmazonRoute53DomainsFullAccess`
- Region: `us-east-1` (the script handles this)
- Script at: `.claude/skills/domain-search/scripts/search.sh`
