import { getLatestBlockTimestamp } from './get-latest-block-timestamp';

export async function getSigDeadline() {
    const timestamp = await getLatestBlockTimestamp();
    const twoHourS = 60 * 60 * 2;
    const deadline = timestamp + twoHourS;
    return deadline;
}
