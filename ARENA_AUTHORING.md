# Arena authoring

How to take one course from "the Arena can be guessed" to "the Arena tests knowledge".
Written so a session that has never seen this repo can run a course without re-deriving
anything. Three courses were done by hand first (cobra, oracle, prima); everything
below is what that cost, turned into a procedure.

## The rule

With four options, someone who knows nothing and always clicks the longest should be
right 25% of the time. Measured across the repo it was 83%.

The rule is **length must carry no information**. That is not the same as "write longer
distractors", and the difference matters enough that `check-arena-tell.js --simulate`
keeps the refutation permanently: raising every distractor to 85% of the correct option
changes the score by exactly nothing, because the tell is being the **maximum**, not the
ratio. If the answer is still the longest, the guesser still wins.

So a distractor has to be the longest option roughly as often as the answer is.

**The target is 25%, not 0%.** Driving it to zero means the answer is reliably *not*
the longest, which is the same tell inverted, and a guesser who learns to avoid the
longest option beats chance. Three of the four hand-fixed courses overshot to 17-20%
on the first attempt.

Distractors must also be plausible. `COGITO_CONTEXT.md` has always said so, and the
content did not honour it: `Use a higher temperature.` appeared as a wrong answer ten
times in oracle. A distractor should be the mistake a real practitioner would make.

## The loop

    node scripts/check-arena-tell.js --course x.html --fix-plan

Prints a per-question work order: which questions already give the answer away, which
quarter of them to leave alone as the intended 25%, and for each of the rest, either
the character offset where the answer's inline reason can be cut, or how many
characters a distractor needs. Author against this rather than at a moving number.

Write a patch file exporting the questions you changed:

```js
module.exports = [
  { id:'p7', c:0, o:[
    'The answer, stated as a claim and nothing more',
    'A mistake a practitioner would actually make',
    'A second plausible mistake, longer than the answer if the plan asked for it',
    'A third'],
    e:'Optional. Supply only when reasoning moved out of the option into here.' },
];
```

Then apply it:

    node scripts/apply-arena-patch.js x.html patch.js --dry   # report only
    node scripts/apply-arena-patch.js x.html patch.js         # write

The tool carries through every field you did not touch, evens out which slot the answer
sits in, refuses to write if anything fails validation, and re-parses the rebuilt page
before saving. Run it with no patch file to fix a slot tell on its own.

## Done

- `check-arena-tell.js --course x.html` reports near 25%, and the correct and distractor
  mean lengths are close.
- The answer is not reliably the **shortest** either. Check the length-rank spread the
  tool prints; it should sit near a quarter in each of the four ranks. Erdos hit 25.0%
  on the headline number with rank 4 at 20 of 40, meaning the answer was the shortest
  option half the time, and a guesser who avoids the shortest option beats chance on
  that. It is the same tell one level down. The three hand-fixed courses still carry it:
  the answer is the shortest 11% of the time in cobra, 15% in oracle, 19% in prima.
- `check-course-spec.js --course x.html` says `to spec`, or reports only `arena 40/100`
  if the pass was de-tell without expansion.
- `node scripts/test-arena-nav.js` passes.
- If the course's `CARDS` changed, `node scripts/gen-review.js` has been re-run.

## Traps

Every one of these cost real time on the first four courses.

- **Overshooting.** First pass lands high, lengthening distractors undershoots below
  25%, and the fix is to revert the edits that padded a qualifier (`noticeably`,
  `and very careful`) rather than adding a claim. Those two facts point the same way:
  the padded version reads worse *and* moves the number the wrong way. `--fix-plan`
  exists to prevent this round trip; use it.
- **No backticks, anywhere.** Four pages (vonbertalanffy, godel, lakoff, wiener) have
  their JS minified onto one line, where a stray backtick or `//` comment takes the
  whole course down. `apply-arena-patch.js` rejects backticks and parses the rebuilt
  page, but do not hand-edit those files.
- **Apostrophes are escaped in the source.** Course files store `can\'t`. If you write
  a script that does raw-text replacement, match the escaped form or use a fragment
  without the apostrophe. This silently matched nothing on prima.
- **Keep the file CRLF.** Course pages are CRLF throughout; a naive write mixes endings
  and produces a diff touching every line. `apply-arena-patch.js` handles it.
- **Do not "fix" questions whose options are bare labels or numbers.** oracle p2 offers
  Role/Task/Constraints/Token Limit and prima p34 offers `~98%` against `~85%`. Length
  was never a signal there, and padding them damages a working question to move a
  statistic. Three such questions were deliberately skipped.
- **Preserve ids.** Saved SM-2 scheduling and solved flags are keyed on them. Add new
  questions with new ids rather than renumbering.
- **A distractor that is defensibly true is worse than one that is hard.** It punishes
  the students who know the most, which is the opposite of what the Arena is for.
  Boltzmann p19 offered "surface tension pulls the top layer into regular hexagonal
  cells" as a wrong answer about convection, but Pearson showed in 1958 that surface
  tension is what drives the hexagonal cells in Benard's own experiment. Before writing
  any distractor, ask whether a well-read student could defend it. In philosophy, stay
  off live scholarly disputes and build from misreadings no interpreter defends. In
  mathematics, watch for the true theorem that answers a different question.
- **Lengthening a stub can manufacture that defect.** Schumpeter p36 had the throwaway
  option "Deregulate everything.", dismissible on sight. Padded to carry a real claim it
  became a principled position a thoughtful student would defend, on a stem that asks
  what you *should* do. When you give a stub a real claim, make it a claim that is
  false, not one that is merely unfashionable.
- **A string can appear twice in the file.** Wittgenstein p23's question text was also
  flashcard c64's front, so a raw replace would have silently edited a card as well.
  Assert the match count before writing, and match on the surrounding field
  (`body:'...'`) rather than the bare sentence. `apply-arena-patch.js` avoids this
  entirely, but it only writes options, the correct index, and the explanation; a
  question body still needs a hand edit.

## Delegating a course

Four courses have been run this way and all four landed on 25.0% first time, so the
overshoot round trip that cost the hand-fixed courses is gone. Three can run in
parallel without interfering. The recipe:

- One agent, one course, one patch file named after the course. Tell it that a dirty
  `git status` from the other agents is expected and not its problem.
- Tell it to **skip `test-arena-nav.js`**. It reads all 52 courses and will race an
  agent mid-write. Run it once in the main session after the batch lands.
- Tell it not to commit, stage, or checkout anything.
- Give it the domain and the misconceptions worth building distractors from. Expect it
  to correct you: erdos was dispatched as combinatorics and is actually applied network
  science, and the agent authored against the real content and said so.
- Require a report section listing **every distractor it is not fully confident is
  false**, and say that an empty section is a claim. This is the highest-value thing it
  produces. In each course that had a genuine defect, the agent's own top-ranked flag
  was that defect. Ask for id lists rather than counts; two reports miscounted their
  own lists.
- Forbid pasting question text, options, drafts, or `--fix-plan` output into the report.
  Keeping that in the agent's context is the entire point.

Then review in the main session: re-run the checks yourself rather than trusting the
report, and read the flagged questions plus a sample of six to eight it was confident
about. The checker measures length and cannot measure believability, so that read is
the only thing standing between a green scoreboard and a course that punishes the
students who know the most.

## Adding questions to reach 100

46 courses hold 40 problems and are specified to hold 100. The shape the five complete
courses use, and which `check-course-spec.js` expects:

- 10 per module, ordered by difficulty within the module: `1,1,1,2,2,2,3,3,3,4`
- across the course that totals 30 easy, 30 medium, 30 hard, 10 expert
- difficulty 1 = 50 XP / 45s, 2 = 100 / 60, 3 = 200 / 90, 4 = 500 / 120

Two things learned writing 97 new problems for cobra. Check each new question against
the ones already in the module before writing it, because 17 of those 97 turned out to
duplicate an existing problem and were cut. And author the four options at comparable
weight from the start; it is far cheaper than lengthening them afterwards.
