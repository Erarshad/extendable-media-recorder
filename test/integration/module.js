import { MediaRecorder, isSupported, register } from '../../src/module';
import { connect } from 'extendable-media-recorder-wav-encoder';
import { createMediaStreamWithAudioTrack } from '../helpers/create-media-stream-with-audio-track';
import { createMediaStreamWithVideoTrack } from '../helpers/create-media-stream-with-video-track';

describe('module', () => {

    if (!process.env.TARGET || !process.env.TARGET.endsWith('-unsupported')) { // eslint-disable-line no-undef

        describe('MediaRecorder', () => {

            before(async () => {
                const port = await connect();

                await register(port);
            });

            // @todo There is currently no way to disable the autoplay policy on BrowserStack or Sauce Labs.
            if (!(process.env.TRAVIS && /Chrome/.test(navigator.userAgent))) { // eslint-disable-line no-undef

                for (const mimeType of [ 'audio/wav', 'audio/webm' ]) {

                    describe(`with the mimeType of ${ mimeType }`, () => {

                        describe('with a MediaStream which contains an audio track', () => {

                            let audioContext;
                            let bufferLength;
                            let mediaRecorder;
                            let mediaStream;

                            afterEach(() => audioContext.close());

                            beforeEach(function (done) {
                                this.timeout(3000);

                                audioContext = new AudioContext();
                                bufferLength = 100;

                                mediaStream = createMediaStreamWithAudioTrack(audioContext, audioContext.sampleRate / bufferLength);
                                mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

                                // Wait two seconds before starting the recording.
                                setTimeout(done, 2000);
                            });

                            it('should abort the encoding when adding a track', function (done) {
                                this.timeout(10000);

                                let err = null;

                                mediaRecorder.addEventListener('dataavailable', () => {
                                    expect(err.code).to.equal(13);
                                    expect(err.name).to.equal('InvalidModificationError');

                                    done();
                                });

                                mediaRecorder.addEventListener('error', ({ error }) => {
                                    err = error;
                                });

                                mediaRecorder.start();

                                setTimeout(() => {
                                    mediaStream.addTrack(createMediaStreamWithAudioTrack(audioContext).getAudioTracks()[0]);
                                }, 1000);
                            });

                            it('should abort the encoding when removing a track', function (done) {
                                this.timeout(10000);

                                let err = null;

                                mediaRecorder.addEventListener('dataavailable', () => {
                                    expect(err.code).to.equal(13);
                                    expect(err.name).to.equal('InvalidModificationError');

                                    done();
                                });

                                mediaRecorder.addEventListener('error', ({ error }) => {
                                    err = error;
                                });

                                mediaRecorder.start();

                                setTimeout(() => {
                                    mediaStream.removeTrack(mediaStream.getAudioTracks()[0]);
                                }, 1000);
                            });

                            it('should encode a mediaStream as a whole', function (done) {
                                this.timeout(20000);

                                mediaRecorder.addEventListener('dataavailable', async ({ data }) => {
                                    // Test if the arrayBuffer is decodable.
                                    const audioBuffer = await audioContext.decodeAudioData(await data.arrayBuffer());

                                    // Test if the audioBuffer is at least half a second long.
                                    expect(audioBuffer.duration).to.be.above(0.5);

                                    // Only test if the audioBuffer contains the ouput of the oscillator when recording a lossless file.
                                    if (mimeType === 'audio/wav') {
                                        const rotatingBuffers = [ new Float32Array(bufferLength), new Float32Array(bufferLength) ];

                                        for (let i = 0; i < audioBuffer.numberOfChannels; i += 1) {
                                            audioBuffer.copyFromChannel(rotatingBuffers[0], i);

                                            for (let startInChannel = bufferLength; startInChannel < audioBuffer.length - bufferLength; startInChannel += bufferLength) {
                                                audioBuffer.copyFromChannel(rotatingBuffers[1], i, startInChannel);

                                                for (let j = 0; j < bufferLength; j += 1) {
                                                    try {
                                                        expect(rotatingBuffers[0][j]).to.not.equal(0);
                                                        expect(rotatingBuffers[0][j]).to.be.closeTo(rotatingBuffers[1][j], 0.0001);
                                                    } catch (err) {
                                                        done(err);

                                                        return;
                                                    }
                                                }

                                                rotatingBuffers.push(rotatingBuffers.shift());
                                            }
                                        }
                                    }

                                    done();
                                });
                                mediaRecorder.start();

                                setTimeout(() => mediaRecorder.stop(), 1000);
                            });

                            it('should encode a mediaStream in chunks', function (done) {
                                this.timeout(20000);

                                const chunks = [ ];

                                mediaRecorder.addEventListener('dataavailable', async ({ data }) => {
                                    chunks.push(data);

                                    if (mediaRecorder.state === 'inactive') {
                                        expect(chunks.length).to.be.above(5);

                                        // Test if the arrayBuffer is decodable.
                                        const audioBuffer = await audioContext.decodeAudioData(await (new Blob(chunks, { mimeType })).arrayBuffer());

                                        // Test if the audioBuffer is at least half a second long.
                                        expect(audioBuffer.duration).to.be.above(0.5);

                                        // Only test if the audioBuffer contains the ouput of the oscillator when recording a lossless file.
                                        if (mimeType === 'audio/wav') {
                                            const rotatingBuffers = [ new Float32Array(bufferLength), new Float32Array(bufferLength) ];

                                            for (let i = 0; i < audioBuffer.numberOfChannels; i += 1) {
                                                audioBuffer.copyFromChannel(rotatingBuffers[0], i);

                                                for (let startInChannel = bufferLength; startInChannel < audioBuffer.length - bufferLength; startInChannel += bufferLength) {
                                                    audioBuffer.copyFromChannel(rotatingBuffers[1], i, startInChannel);

                                                    for (let j = 0; j < bufferLength; j += 1) {
                                                        try {
                                                            expect(rotatingBuffers[0][j]).to.not.equal(0);
                                                            expect(rotatingBuffers[0][j]).to.be.closeTo(rotatingBuffers[1][j], 0.0001);
                                                        } catch (err) {
                                                            done(err);

                                                            return;
                                                        }
                                                    }

                                                    rotatingBuffers.push(rotatingBuffers.shift());
                                                }
                                            }
                                        }

                                        done();
                                    }
                                });
                                mediaRecorder.start(100);

                                setTimeout(() => mediaRecorder.stop(), 1000);
                            });

                        });

                        describe('with a MediaStream which contains a video track', () => {

                            let mediaRecorder;

                            beforeEach(() => {
                                const mediaStream = createMediaStreamWithVideoTrack();

                                mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
                            });

                            it('should throw a NotSupportedError', (done) => {
                                try {
                                    mediaRecorder.start();
                                } catch (err) {
                                    expect(err.code).to.equal(9);
                                    expect(err.name).to.equal('NotSupportedError');

                                    done();
                                }
                            });

                        });

                    });

                }

            }

            describe('with the mimeType of audio/anything', () => {

                let audioContext;
                let mediaStream;

                afterEach(() => audioContext.close());

                beforeEach(() => {
                    audioContext = new AudioContext();

                    mediaStream = createMediaStreamWithAudioTrack(audioContext);
                });

                it('should throw a NotSupportedError', (done) => {
                    try {
                        new MediaRecorder(mediaStream, { mimeType: 'audio/anything' });
                    } catch (err) {
                        expect(err.code).to.equal(9);
                        expect(err.name).to.equal('NotSupportedError');

                        done();
                    }
                });

            });

        });

    }

    describe('isSupported()', () => {

        if (process.env.TARGET && process.env.TARGET.endsWith('-unsupported')) { // eslint-disable-line no-undef

            it('should resolve to false', async () => {
                expect(await isSupported()).to.be.false;
            });

        } else {

            it('should resolve to true', async () => {
                expect(await isSupported()).to.be.true;
            });

        }

    });

});
