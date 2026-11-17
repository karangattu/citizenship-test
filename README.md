# citizenship-test

An online practice test for people who want to take the citizenship test for the United States.

In a quiz, select **Listen to question** to hear it, or **Show question** if you need to read it. Questions use prerecorded AI speech. After a recording plays online, it can replay offline on the same device.

The 128 recordings use the [OpenAI Marin voice](https://developers.openai.com/api/docs/guides/text-to-speech). If you edit the question text, run `node scripts/generate-question-audio.js` with `OPENAI_API_KEY` set. It records new or changed questions; changes to answers alone do not require new audio. Bump the cache version in `sw.js` when replacing a recording so returning visitors hear the update. Run `node scripts/validate.js` to confirm each question has a recording.
