export function calculateWPM(correctChars, timeElapsed) {
    const minutes = timeElapsed / 60;
    return Math.round((correctChars / 5) / minutes) || 0;
  }
  
  export function calculateAccuracy(correct, total) {
    return Math.round((correct / total) * 100) || 100;
  }