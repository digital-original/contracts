import { getLatestBlockTimestamp } from './get-latest-block-timestamp';

export async function getSigDeadline() {
    const timestamp = await getLatestBlockTimestamp();
    const oneHourS = 60 * 60;
    const deadline = timestamp + oneHourS;
    return deadline;
}
